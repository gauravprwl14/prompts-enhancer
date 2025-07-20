import os
import pickle
from typing import List, Dict, Tuple, Optional
import numpy as np
from pathlib import Path
from tqdm import tqdm
from transformers import AutoTokenizer, AutoModel
import torch
import faiss

from app.models.prompt import Prompt


class EmbeddingService:
    """Service for managing prompt embeddings using FAISS and Hugging Face transformers"""
    
    def __init__(self, model_name: str = "sentence-transformers/all-MiniLM-L6-v2", index_dir: str = "embeddings"):
        """
        Initialize embedding service
        
        Args:
            model_name: Name of the Hugging Face model to use
            index_dir: Directory to store FAISS index and metadata
        """
        self.model_name = model_name
        self.index_dir = Path(index_dir)
        self.index_dir.mkdir(exist_ok=True)
        
        # Initialize Hugging Face model and tokenizer
        print(f"Loading Hugging Face model: {model_name}")
        self.tokenizer = AutoTokenizer.from_pretrained(model_name)
        self.model = AutoModel.from_pretrained(model_name)
        
        # Set model to evaluation mode
        self.model.eval()
        
        # FAISS index and metadata
        self.index = None
        self.prompt_metadata = []
        self.index_path = self.index_dir / "faiss_index.bin"
        self.metadata_path = self.index_dir / "prompt_metadata.pkl"
        
        # Load existing index if available
        self._load_index()
    
    def _load_index(self):
        """Load existing FAISS index and metadata if available"""
        if self.index_path.exists() and self.metadata_path.exists():
            try:
                print("Loading existing FAISS index...")
                self.index = faiss.read_index(str(self.index_path))
                
                with open(self.metadata_path, 'rb') as f:
                    self.prompt_metadata = pickle.load(f)
                
                print(f"Loaded index with {len(self.prompt_metadata)} prompts")
            except Exception as e:
                print(f"Error loading existing index: {e}")
                self.index = None
                self.prompt_metadata = []
    
    def _save_index(self):
        """Save FAISS index and metadata"""
        if self.index is not None:
            faiss.write_index(self.index, str(self.index_path))
            with open(self.metadata_path, 'wb') as f:
                pickle.dump(self.prompt_metadata, f)
            print(f"Saved index with {len(self.prompt_metadata)} prompts")
    
    def _create_text_for_embedding(self, prompt: Prompt) -> str:
        """
        Create text for embedding from prompt data
        
        Args:
            prompt: Prompt object
            
        Returns:
            Text string for embedding
        """
        # Combine title, description, and text for better semantic search
        text_parts = []
        
        if prompt.title:
            text_parts.append(f"Title: {prompt.title}")
        
        if prompt.description:
            text_parts.append(f"Description: {prompt.description}")
        
        # Add text content (first 500 characters to avoid too long embeddings)
        if prompt.prompt:
            text_content = prompt.prompt[:500] + "..." if len(prompt.prompt) > 500 else prompt.prompt
            text_parts.append(f"Content: {text_content}")
        
        # Add tags
        if prompt.tags:
            text_parts.append(f"Tags: {', '.join(prompt.tags)}")
        
        return " | ".join(text_parts)
    
    def _encode_texts(self, texts: List[str], show_progress: bool = True) -> np.ndarray:
        """
        Encode texts to embeddings using Hugging Face model
        
        Args:
            texts: List of text strings
            show_progress: Whether to show progress bar
            
        Returns:
            Numpy array of embeddings
        """
        embeddings = []
        
        iterator = tqdm(texts, desc="Generating embeddings") if show_progress else texts
        
        for text in iterator:
            # Tokenize text
            inputs = self.tokenizer(
                text,
                padding=True,
                truncation=True,
                max_length=1024,
                return_tensors="pt"
            )
            
            # Generate embeddings
            with torch.no_grad():
                outputs = self.model(**inputs)
                # Use mean pooling of last hidden state
                attention_mask = inputs['attention_mask']
                embeddings_tensor = outputs.last_hidden_state * attention_mask.unsqueeze(-1)
                embeddings_tensor = embeddings_tensor.sum(dim=1) / attention_mask.sum(dim=1, keepdim=True)
                embedding = embeddings_tensor.squeeze().cpu().numpy()
                embeddings.append(embedding)
        
        return np.array(embeddings)
    
    def embed_prompts(self, prompts: List[Prompt], show_progress: bool = True) -> None:
        """
        Embed all prompts and store in FAISS index
        
        Args:
            prompts: List of prompt objects
            show_progress: Whether to show progress bar
        """
        if not prompts:
            print("No prompts to embed")
            return
        
        print(f"Embedding {len(prompts)} prompts...")
        
        # Prepare texts for embedding
        texts = []
        metadata = []
        
        iterator = tqdm(prompts, desc="Preparing prompts") if show_progress else prompts
        
        for prompt in iterator:
            text = self._create_text_for_embedding(prompt)
            texts.append(text)
            metadata.append({
                'id': prompt.id,
                'title': prompt.title,
                'description': prompt.description,
                'tags': prompt.tags
            })
        
        # Generate embeddings
        print("Generating embeddings...")
        embeddings = self._encode_texts(texts, show_progress=show_progress)
        
        # Convert to float32 for FAISS
        embeddings = embeddings.astype('float32')
        
        # Create or update FAISS index
        dimension = embeddings.shape[1]
        
        if self.index is None:
            # Create new index
            self.index = faiss.IndexFlatIP(dimension)  # Inner product for cosine similarity
            print(f"Created new FAISS index with dimension {dimension}")
        
        # Add vectors to index
        self.index.add(embeddings)
        
        # Update metadata
        self.prompt_metadata.extend(metadata)
        
        # Save index
        self._save_index()
        
        print(f"Successfully embedded {len(prompts)} prompts")
    
    def search_similar_prompts(self, query: str, top_k: int = 5) -> List[Dict]:
        """
        Search for similar prompts based on query
        
        Args:
            query: Search query
            top_k: Number of top results to return
            
        Returns:
            List of similar prompts with scores
        """
        if self.index is None or len(self.prompt_metadata) == 0:
            return []
        
        # Encode query
        query_embedding = self._encode_texts([query], show_progress=False)
        query_embedding = query_embedding.astype('float32')
        
        # Search in FAISS index
        scores, indices = self.index.search(query_embedding, min(top_k, len(self.prompt_metadata)))
        
        # Prepare results
        results = []
        for score, idx in zip(scores[0], indices[0]):
            if idx < len(self.prompt_metadata):
                result = self.prompt_metadata[idx].copy()
                result['similarity_score'] = float(score)
                results.append(result)
        
        return results
    
    def get_index_stats(self) -> Dict:
        """Get statistics about the FAISS index"""
        if self.index is None:
            return {
                'total_prompts': 0,
                'index_size': 0,
                'dimension': 0
            }
        
        return {
            'total_prompts': len(self.prompt_metadata),
            'index_size': self.index.ntotal,
            'dimension': self.index.d
        }
    
    def clear_index(self):
        """Clear the FAISS index and metadata"""
        self.index = None
        self.prompt_metadata = []
        
        # Remove saved files
        if self.index_path.exists():
            self.index_path.unlink()
        if self.metadata_path.exists():
            self.metadata_path.unlink()
        
        print("Cleared FAISS index") 
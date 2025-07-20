import torch
from transformers import AutoTokenizer, AutoModel
from typing import List, Dict, Tuple
import numpy as np
from tqdm import tqdm


class RerankingService:
    """Service for reranking search results with relevance filtering"""
    
    def __init__(self, model_name: str = "sentence-transformers/all-MiniLM-L6-v2"):
        """
        Initialize reranking service
        
        Args:
            model_name: Name of the model for reranking (using same model as embedding for consistency)
        """
        self.model_name = model_name
        print(f"Loading reranking model: {model_name}")
        
        # Load model and tokenizer
        self.tokenizer = AutoTokenizer.from_pretrained(model_name)
        self.model = AutoModel.from_pretrained(model_name)
        self.model.eval()
    
    def rerank_results(
        self, 
        query: str, 
        candidates: List[Dict], 
        top_k: int = 5,
        relevance_threshold: float = 0.3,
        show_progress: bool = True
    ) -> List[Dict]:
        """
        Rerank search results using semantic similarity
        
        Args:
            query: Search query
            candidates: List of candidate prompts from FAISS search
            top_k: Number of top results to return
            relevance_threshold: Minimum relevance score to include
            show_progress: Whether to show progress bar
            
        Returns:
            Reranked list of prompts with relevance scores
        """
        if not candidates:
            return []
        
        try:
            # Prepare query-document pairs
            pairs = []
            for candidate in candidates:
                doc_text = self._create_document_text(candidate)
                pairs.append((query, doc_text))
            
            # Get similarity scores
            scores = self._get_similarity_scores(pairs, show_progress)
            
            # Combine candidates with scores and filter by threshold
            scored_candidates = []
            for candidate, score in zip(candidates, scores):
                candidate_copy = candidate.copy()
                candidate_copy['relevance_score'] = float(score)
                candidate_copy['reranked_score'] = float(score)
                
                if score >= relevance_threshold:
                    scored_candidates.append(candidate_copy)
            
            # Sort by relevance score (descending)
            scored_candidates.sort(key=lambda x: x['relevance_score'], reverse=True)
            
            # Return top_k results
            return scored_candidates[:top_k]
            
        except Exception as e:
            print(f"Error in reranking: {e}")
            # Fallback to original results
            return candidates[:top_k]
    
    def _create_document_text(self, candidate: Dict) -> str:
        """
        Create document text from candidate metadata
        
        Args:
            candidate: Candidate prompt metadata
            
        Returns:
            Formatted document text
        """
        parts = []
        
        if candidate.get('title'):
            parts.append(f"Title: {candidate['title']}")
        
        if candidate.get('description'):
            parts.append(f"Description: {candidate['description']}")
        
        if candidate.get('tags'):
            parts.append(f"Tags: {', '.join(candidate['tags'])}")
        
        return " | ".join(parts)
    
    def _get_similarity_scores(
        self, 
        pairs: List[Tuple[str, str]], 
        show_progress: bool = True
    ) -> List[float]:
        """
        Get similarity scores for query-document pairs
        
        Args:
            pairs: List of (query, document) pairs
            show_progress: Whether to show progress bar
            
        Returns:
            List of similarity scores
        """
        scores = []
        
        iterator = tqdm(pairs, desc="Reranking results") if show_progress else pairs
        
        for query, document in iterator:
            try:
                # Tokenize both query and document
                query_inputs = self.tokenizer(
                    query,
                    padding=True,
                    truncation=True,
                    max_length=512,
                    return_tensors="pt"
                )
                
                doc_inputs = self.tokenizer(
                    document,
                    padding=True,
                    truncation=True,
                    max_length=512,
                    return_tensors="pt"
                )
                
                # Generate embeddings
                with torch.no_grad():
                    query_outputs = self.model(**query_inputs)
                    doc_outputs = self.model(**doc_inputs)
                    
                    # Use mean pooling
                    query_attention_mask = query_inputs['attention_mask']
                    doc_attention_mask = doc_inputs['attention_mask']
                    
                    query_embeddings = query_outputs.last_hidden_state * query_attention_mask.unsqueeze(-1)
                    query_embeddings = query_embeddings.sum(dim=1) / query_attention_mask.sum(dim=1, keepdim=True)
                    
                    doc_embeddings = doc_outputs.last_hidden_state * doc_attention_mask.unsqueeze(-1)
                    doc_embeddings = doc_embeddings.sum(dim=1) / doc_attention_mask.sum(dim=1, keepdim=True)
                    
                    # Calculate cosine similarity
                    query_emb = query_embeddings.squeeze().cpu().numpy()
                    doc_emb = doc_embeddings.squeeze().cpu().numpy()
                    
                    similarity = np.dot(query_emb, doc_emb) / (np.linalg.norm(query_emb) * np.linalg.norm(doc_emb))
                    scores.append(max(0.0, min(1.0, similarity)))  # Clamp to [0, 1]
                    
            except Exception as e:
                print(f"Error calculating similarity: {e}")
                scores.append(0.0)  # Fallback score
        
        return scores
    
    def filter_by_relevance(
        self, 
        results: List[Dict], 
        threshold: float = 0.3
    ) -> List[Dict]:
        """
        Filter results by relevance threshold
        
        Args:
            results: List of search results with scores
            threshold: Minimum relevance score
            
        Returns:
            Filtered results
        """
        return [result for result in results if result.get('relevance_score', 0) >= threshold]
    
    def get_reranking_stats(self, results: List[Dict]) -> Dict:
        """
        Get statistics about reranking results
        
        Args:
            results: List of reranked results
            
        Returns:
            Statistics dictionary
        """
        if not results:
            return {
                'total_results': 0,
                'avg_relevance_score': 0,
                'min_relevance_score': 0,
                'max_relevance_score': 0
            }
        
        scores = [result.get('relevance_score', 0) for result in results]
        
        return {
            'total_results': len(results),
            'avg_relevance_score': float(np.mean(scores)),
            'min_relevance_score': float(np.min(scores)),
            'max_relevance_score': float(np.max(scores))
        } 
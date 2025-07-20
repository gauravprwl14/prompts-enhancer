import os
import yaml
from typing import List, Optional, Dict, Any
from pathlib import Path

from app.models.prompt import Prompt, Variable, VariableType, PromptList, PromptWithValues
from app.services.embedding_service import EmbeddingService
from app.services.reranking_service import RerankingService


class PromptService:
    """Service for managing prompts"""
    
    def __init__(self, prompts_dir: str = "prompts"):
        self.prompts_dir = Path(prompts_dir)
        self.prompts_dir.mkdir(exist_ok=True)
        
        # Initialize embedding service
        self.embedding_service = EmbeddingService()
        
        # Initialize reranking service (with error handling)
        try:
            self.reranking_service = RerankingService()
            self.reranking_available = True
        except Exception as e:
            print(f"Reranking service initialization failed: {e}")
            self.reranking_service = None
            self.reranking_available = False
    
    def _embed_all_prompts(self):
        """Embed all prompts during service initialization"""
        prompts = self._load_all_prompts()
        if prompts:
            self.embedding_service.embed_prompts(prompts, show_progress=True)
    
    def _load_all_prompts(self) -> List[Prompt]:
        """Load all prompts from files without creating PromptList"""
        prompts = []
        
        # Find all YAML files in prompts directory
        for file_path in self.prompts_dir.glob("*.yml"):
            prompt = self.load_prompt_from_file(file_path)
            if prompt:
                prompts.append(prompt)
        
        # Also check for .yaml files
        for file_path in self.prompts_dir.glob("*.yaml"):
            prompt = self.load_prompt_from_file(file_path)
            if prompt:
                prompts.append(prompt)
        
        return prompts
    def _load_by_id(self, prompt_id: str) -> Optional[Prompt]:
        """Load a single prompt from files without creating PromptList"""
        file_path = self.prompts_dir / f"{prompt_id}.yml"
        return self.load_prompt_from_file(file_path)
    
    def load_prompt_from_file(self, file_path: Path) -> Optional[Prompt]:
        """Load a single prompt from YAML file"""
        try:
            with open(file_path, 'r', encoding='utf-8') as file:
                data = yaml.safe_load(file)
            
            # Convert variables from dict to Variable objects
            variables = []
            for var_data in data.get('variables', []):
                variable = Variable(
                    name=var_data['name'],
                    type=VariableType("text_input"),
                    description=var_data.get('description'),
                    default_value="NA",
                    options=[],
                    required=False
                )
                variables.append(variable)
            
            # Create prompt object
            prompt = Prompt(
                id=data.get('id', file_path.stem),
                title=data['title'],
                prompt=data['prompt'],
                description=data.get('description'),
                variables=variables,
                tags=data.get('tags', [])
            )
            
            return prompt
            
        except Exception as e:
            print(f"Error loading prompt from {file_path}: {e}")
            return None
    
    def get_all_prompts(self) -> PromptList:
        """Get all prompts from the prompts directory"""
        prompts = self._load_all_prompts()
        return PromptList(prompts=prompts, total=len(prompts))
    
    def get_prompt_by_id(self, prompt_id: str) -> Optional[Prompt]:
        """Get a specific prompt by ID"""
        return self._load_by_id(prompt_id)
    
    def render_prompt_with_variables(self, prompt_id: str, variable_values: Dict[str, Any]) -> Optional[PromptWithValues]:
        """Render a prompt with variable values"""
        prompt = self.get_prompt_by_id(prompt_id)
        if not prompt:
            return None
        
        rendered_text = prompt.prompt
        
        # Replace variables in the text
        for variable in prompt.variables:
            var_name = variable.name
            var_value = variable_values.get(var_name)
            
            if var_value is None:
                if variable.default_value:
                    var_value = variable.default_value
                elif variable.required:
                    raise ValueError(f"Required variable '{var_name}' not provided")
                else:
                    var_value = ""
            
            # Replace placeholder in text (format: {{variable_name}})
            placeholder = f"{{{{{var_name}}}}}"
            rendered_text = rendered_text.replace(placeholder, str(var_value))
        
        return PromptWithValues(
            prompt=prompt,
            variable_values=variable_values,
            rendered_text=rendered_text
        )
    
    def search_prompts(
        self, 
        query: str, 
        top_k: int = 5, 
        use_reranking: bool = True,
        relevance_threshold: float = 0.3,
        initial_candidates: int = 20
    ) -> List[Dict]:
        """
        Search for similar prompts using embeddings with optional reranking
        
        Args:
            query: Search query
            top_k: Number of top results to return
            use_reranking: Whether to use reranking for better results
            relevance_threshold: Minimum relevance score for reranking
            initial_candidates: Number of initial candidates from FAISS
            
        Returns:
            List of similar prompts with scores
        """
        # Get initial candidates from FAISS
        initial_results = self.embedding_service.search_similar_prompts(query, initial_candidates)
        
        if not use_reranking or not initial_results or not self.reranking_available:
            # Return top_k from initial results
            return initial_results[:top_k]
        
        try:
            # Apply reranking with relevance filtering
            reranked_results = self.reranking_service.rerank_results(
                query=query,
                candidates=initial_results,
                top_k=top_k,
                relevance_threshold=relevance_threshold,
                show_progress=True
            )
            
            return reranked_results
        except Exception as e:
            print(f"Reranking failed, falling back to initial results: {e}")
            # Return top_k from initial results if reranking fails
            return initial_results[:top_k]
    
    def get_embedding_stats(self) -> Dict:
        """Get statistics about the embedding index"""
        return self.embedding_service.get_index_stats()
    
    def get_reranking_stats(self, results: List[Dict]) -> Dict:
        """Get statistics about reranking results"""
        return self.reranking_service.get_reranking_stats(results)
    
    def reindex_prompts(self) -> None:
        """Reindex all prompts (useful when prompts are updated)"""
        print("Reindexing all prompts...")
        self.embedding_service.clear_index()
        self._embed_all_prompts() 
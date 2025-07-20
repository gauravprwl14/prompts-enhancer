from fastapi import APIRouter, HTTPException, Depends, Query
from typing import Dict, Any, Optional, List

from app.models.prompt import Prompt, PromptList, PromptWithValues
from app.services.prompt_service import PromptService


router = APIRouter(prefix="/api/prompts", tags=["prompts"])


def get_prompt_service() -> PromptService:
    """Dependency to get prompt service instance"""
    return PromptService()


@router.get("/", response_model=PromptList)
async def get_all_prompts(
    prompt_service: PromptService = Depends(get_prompt_service)
):
    """Get all available prompts"""
    try:
        return prompt_service.get_all_prompts()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving prompts: {str(e)}")


@router.get("/{prompt_id}", response_model=Prompt)
async def get_prompt_by_id(
    prompt_id: str,
    prompt_service: PromptService = Depends(get_prompt_service)
):
    """Get a specific prompt by ID"""
    try:
        prompt = prompt_service.get_prompt_by_id(prompt_id)
        if not prompt:
            raise HTTPException(status_code=404, detail=f"Prompt with ID '{prompt_id}' not found")
        return prompt
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving prompt: {str(e)}")


@router.post("/{prompt_id}/render", response_model=PromptWithValues)
async def render_prompt(
    prompt_id: str,
    variable_values: Dict[str, Any],
    prompt_service: PromptService = Depends(get_prompt_service)
):
    """Render a prompt with provided variable values"""
    try:
        rendered_prompt = prompt_service.render_prompt_with_variables(prompt_id, variable_values)
        if not rendered_prompt:
            raise HTTPException(status_code=404, detail=f"Prompt with ID '{prompt_id}' not found")
        return rendered_prompt
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error rendering prompt: {str(e)}")


@router.get("/{prompt_id}/variables")
async def get_prompt_variables(
    prompt_id: str,
    prompt_service: PromptService = Depends(get_prompt_service)
):
    """Get variables for a specific prompt"""
    try:
        prompt = prompt_service.get_prompt_by_id(prompt_id)
        if not prompt:
            raise HTTPException(status_code=404, detail=f"Prompt with ID '{prompt_id}' not found")
        return {"variables": prompt.variables}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving prompt variables: {str(e)}")


@router.get("/search/", response_model=List[Dict])
async def search_prompts(
    query: str = Query(..., description="Search query for finding similar prompts"),
    top_k: int = Query(5, ge=1, le=20, description="Number of top results to return"),
    use_reranking: bool = Query(True, description="Whether to use reranking for better results"),
    relevance_threshold: float = Query(0.3, ge=0.0, le=1.0, description="Minimum relevance score for reranking"),
    initial_candidates: int = Query(20, ge=5, le=50, description="Number of initial candidates from FAISS"),
    prompt_service: PromptService = Depends(get_prompt_service)
):
    """Search for similar prompts using semantic search with optional reranking"""
    try:
        results = prompt_service.search_prompts(
            query=query,
            top_k=top_k,
            use_reranking=use_reranking,
            relevance_threshold=relevance_threshold,
            initial_candidates=initial_candidates
        )
        
        return results
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error searching prompts: {str(e)}")


@router.get("/stats/embedding")
async def get_embedding_stats(
    prompt_service: PromptService = Depends(get_prompt_service)
):
    """Get statistics about the embedding index"""
    try:
        stats = prompt_service.get_embedding_stats()
        return stats
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving embedding stats: {str(e)}")


@router.get("/status/reranking")
async def get_reranking_status(
    prompt_service: PromptService = Depends(get_prompt_service)
):
    """Check if reranking service is available"""
    try:
        return {
            "reranking_available": prompt_service.reranking_available,
            "status": "available" if prompt_service.reranking_available else "unavailable"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error checking reranking status: {str(e)}")


@router.post("/stats/reranking")
async def get_reranking_stats(
    results: List[Dict],
    prompt_service: PromptService = Depends(get_prompt_service)
):
    """Get statistics about reranking results"""
    try:
        stats = prompt_service.get_reranking_stats(results)
        return stats
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving reranking stats: {str(e)}")


@router.post("/reindex")
async def reindex_prompts(
    prompt_service: PromptService = Depends(get_prompt_service)
):
    """Reindex all prompts (useful when prompts are updated)"""
    try:
        prompt_service.reindex_prompts()
        return {"message": "Successfully reindexed all prompts"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error reindexing prompts: {str(e)}")



from typing import List, Optional, Union, Dict, Any
from pydantic import BaseModel
from enum import Enum


class VariableType(str, Enum):
    """Types of variables that can be used in prompts"""
    TEXT_INPUT = "text_input"
    SELECTION = "selection"
    DEFAULT_VALUE = "default_value"


class Variable(BaseModel):
    """Model for prompt variables"""
    name: str
    type: VariableType
    description: Optional[str] = None
    default_value: Optional[str] = None
    options: Optional[List[str]] = None  # For selection type
    required: bool = True
    
    class Config:
        use_enum_values = True


class Prompt(BaseModel):
    """Model for prompts"""
    id: str
    title: str
    prompt: str
    description: Optional[str] = None
    variables: List[Variable] = []
    tags: List[str] = []
    
    class Config:
        json_encoders = {
            # Custom serializers if needed
        }


class PromptList(BaseModel):
    """Model for list of prompts"""
    prompts: List[Prompt]
    total: int


class PromptWithValues(BaseModel):
    """Model for prompt with filled variable values"""
    prompt: Prompt
    variable_values: Dict[str, Any]
    rendered_text: str 
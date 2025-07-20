# Prompt Directory Server

A FastAPI server for managing and serving prompts with variables. This server provides a REST API to manage prompt templates stored in YAML files, with support for different variable types including text inputs, selections, and default values.

## Features

- **MVC Architecture**: Clean separation of concerns with Models, Views (Controllers), and Services
- **YAML-based Prompts**: Store prompts in easy-to-edit YAML files
- **Variable Types**: Support for text input, selection dropdown, and default value variables
- **REST API**: Full REST API with automatic OpenAPI documentation
- **Variable Rendering**: Render prompts with provided variable values
- **Semantic Search**: FAISS-based embedding search for finding similar prompts
- **Free Embeddings**: Uses sentence-transformers for cost-free embeddings
- **Progress Tracking**: Visual progress bars during embedding operations
- **Error Handling**: Comprehensive error handling and validation

## Project Structure

```
prompt-dir-server/
├── app/
│   ├── __init__.py
│   ├── main.py                 # FastAPI application entry point
│   ├── models/
│   │   ├── __init__.py
│   │   └── prompt.py          # Pydantic models for prompts and variables
│   ├── controllers/
│   │   ├── __init__.py
│   │   └── prompt_controller.py # API routes and endpoints
│   └── services/
│       ├── __init__.py
│       ├── prompt_service.py   # Business logic for prompt management
│       ├── embedding_service.py # FAISS embedding service
│       └── reranking_service.py # Cross-encoder reranking service
├── prompts/                    # Directory containing YAML prompt files
│   ├── code_review.yml
│   ├── email_template.yml
│   ├── meeting_summary.yml
│   └── technical_documentation.yml
├── embeddings/                 # Directory for FAISS index and metadata
├── requirements.txt
└── README.md
```

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd prompt-dir-server
```

2. Install dependencies:
```bash
pip install -r requirements.txt
```

## Usage

### Starting the Server

```bash
# Using uvicorn directly
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload

# Or using Python
python -m app.main
```

The server will start on `http://localhost:8000`

### API Documentation

- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`

### API Endpoints

#### Get All Prompts
```
GET /api/prompts/
```
Returns a list of all available prompts.

#### Get Specific Prompt
```
GET /api/prompts/{prompt_id}
```
Returns details of a specific prompt by ID.

#### Get Prompt Variables
```
GET /api/prompts/{prompt_id}/variables
```
Returns the variables defined for a specific prompt.

#### Render Prompt
```
POST /api/prompts/{prompt_id}/render
```
Renders a prompt with provided variable values.

Request body:
```json
{
  "variable_name": "variable_value",
  "another_variable": "another_value"
}
```

#### Search Prompts
```
GET /api/prompts/search/?query=your_search_query&top_k=5&use_reranking=true&relevance_threshold=0.3&initial_candidates=20
```
Search for similar prompts using semantic search with optional reranking.

Parameters:
- `query`: Search query
- `top_k`: Number of final results (1-20)
- `use_reranking`: Enable/disable reranking (default: true)
- `relevance_threshold`: Minimum relevance score (0.0-1.0)
- `initial_candidates`: Number of initial FAISS candidates (5-50)

#### Get Embedding Stats
```
GET /api/prompts/stats/embedding
```
Get statistics about the embedding index.

#### Get Reranking Stats
```
POST /api/prompts/stats/reranking
```
Get statistics about reranking results (requires results in request body).

#### Check Reranking Status
```
GET /api/prompts/status/reranking
```
Check if reranking service is available.

#### Reindex Prompts
```
POST /api/prompts/reindex
```
Reindex all prompts (useful when prompts are updated).

## YAML Prompt Format

Prompts are stored as YAML files in the `prompts/` directory. Here's the structure:

```yaml
id: "unique_prompt_id"
title: "Prompt Title"
description: "Optional description of the prompt"
text: |
  The prompt text with variables in {{variable_name}} format.
  You can use multiple {{variables}} throughout the text.

variables:
  - name: "variable_name"
    type: "text_input"  # or "selection" or "default_value"
    description: "Description of what this variable is for"
    required: true      # or false
    default_value: "optional default value"
    options:            # only for selection type
      - "Option 1"
      - "Option 2"

tags:
  - "tag1"
  - "tag2"
```

### Variable Types

1. **text_input**: Free text input field
2. **selection**: Dropdown with predefined options
3. **default_value**: Variable with a default value that can be overridden

### Variable Properties

- `name`: Unique name for the variable (used in prompt text as `{{name}}`)
- `type`: One of the supported variable types
- `description`: Human-readable description
- `required`: Whether the variable must be provided (default: true)
- `default_value`: Default value if not provided
- `options`: List of available options (only for selection type)

## Example Usage

### 1. Get all prompts:
```bash
curl http://localhost:8000/api/prompts/
```

### 2. Get a specific prompt:
```bash
curl http://localhost:8000/api/prompts/code_review
```

### 3. Render a prompt with variables:
```bash
curl -X POST http://localhost:8000/api/prompts/code_review/render \
  -H "Content-Type: application/json" \
  -d '{
    "language": "Python",
    "code": "def hello():\n    print(\"Hello World\")",
    "review_type": "General"
  }'
```

### 4. Search for similar prompts:
```bash
# Basic search
curl "http://localhost:8000/api/prompts/search/?query=code%20review&top_k=3"

# Advanced search with reranking
curl "http://localhost:8000/api/prompts/search/?query=technical%20documentation&top_k=5&use_reranking=true&relevance_threshold=0.5&initial_candidates=15"
```

### 5. Get embedding statistics:
```bash
curl "http://localhost:8000/api/prompts/stats/embedding"
```

### 6. Reindex all prompts:
```bash
curl -X POST "http://localhost:8000/api/prompts/reindex"
```

## Embedding and Search

The server uses FAISS (Facebook AI Similarity Search) with Hugging Face transformers for semantic search functionality:

### Features
- **Free Embeddings**: Uses Hugging Face `all-MiniLM-L6-v2` model (no API costs)
- **Automatic Indexing**: Prompts are embedded during server startup
- **Progress Tracking**: Visual progress bars during embedding operations
- **Semantic Search**: Find similar prompts based on content and descriptions
- **Reranking**: Two-stage search with semantic similarity reranking for better relevance
- **Relevance Filtering**: Filter results by relevance threshold
- **Graceful Fallback**: Falls back to FAISS-only search if reranking fails
- **Persistent Storage**: Embeddings are saved to disk for faster startup

### How It Works
1. During startup, the server loads all prompts from YAML files
2. Each prompt's title, description, content, and tags are combined into a text representation
3. The text is embedded using Hugging Face transformers with mean pooling
4. Embeddings are stored in a FAISS index for fast similarity search
5. The index is saved to disk for future use

### Search and Reranking Process
1. **Initial Search**: FAISS retrieves initial candidates using vector similarity
2. **Reranking**: Semantic similarity model reranks candidates for better relevance
3. **Filtering**: Results are filtered by relevance threshold
4. **Final Ranking**: Results are sorted by relevance score
5. **Fallback**: If reranking fails, falls back to FAISS-only results

### Search Functionality
- **Two-Stage Search**: FAISS for initial retrieval + semantic similarity for reranking
- **Relevance Scoring**: Cosine similarity provides relevance scores (0-1)
- **Configurable Filtering**: Set minimum relevance threshold
- **Flexible Parameters**: Control initial candidates, top results, and reranking
- **Progress Tracking**: Visual progress bars for both embedding and reranking
- **Graceful Fallback**: Automatic fallback to FAISS-only search if reranking fails

## Development

### Adding New Prompts

1. Create a new YAML file in the `prompts/` directory
2. Follow the YAML format described above
3. The server will automatically detect and load the new prompt
4. Embeddings will be automatically generated on next startup

### Extending the API

- Add new models in `app/models/`
- Add new business logic in `app/services/`
- Add new endpoints in `app/controllers/`
- Register new routers in `app/main.py`

## Health Check

The server provides a health check endpoint:
```
GET /health
```

## Error Handling

The API provides detailed error messages for common scenarios:
- 404: Prompt not found
- 400: Invalid variable values or missing required variables
- 500: Server errors

## Contributing

1. Follow the existing MVC structure
2. Add proper error handling
3. Update documentation for new features
4. Test your changes thoroughly 
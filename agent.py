import json, os, re
from typing import TypedDict, Dict, Any, Optional
from langchain_core.runnables.graph_mermaid import draw_mermaid_png
from langchain_groq import ChatGroq
from langgraph.graph import StateGraph, END
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_openai import ChatOpenAI
from openrouter import ChatOpenRouter
from rich.console import Console
from rich.panel import Panel
from dotenv import load_dotenv
from utils import clean_the_text, extract_and_parse_json, parse_keywords_from_json
from prompts import (
    EXTRACT_INFO_PROMPT,
    EDIT_TECHNICAL_SKILLS_PROMPT,
    EDIT_EXPERIENCE_PROMPT,
    EDIT_PROJECTS_PROMPT,
    JUDGE_QUALITY_PROMPT,
    KEYWORDS_EXTRACTION_PROMPT,
    FEEDBACK_CONTEXT_TEMPLATE,
    FEEDBACK_CONTEXT_EXPERIENCE_TEMPLATE,
    FEEDBACK_CONTEXT_PROJECTS_TEMPLATE,
)

load_dotenv()

GROQ_API_KEY = os.getenv("GROQ_API_KEY")
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
console = Console()

# Log the current deciding score threshold
DECIDING_SCORE = float(os.getenv("DECIDING_SCORE", "8.1"))
console.print(f"[bold blue]🤖 Agent initialized with DECIDING_SCORE threshold: {DECIDING_SCORE}[/bold blue]")


class AgentState(TypedDict):
    resume_data: Dict[str, Any]
    job_description: str
    company_name: str
    position: str
    location: str
    tailored_resume_data: Dict[str, Any]
    score: float
    feedback: str
    downsides: str
    iteration_count: int
    user_id: str
    user_tier: str
    user_api_key: Optional[str]


def get_user_context(state):
    """Get user context from state"""
    user_id = state.get("user_id", "")
    user_tier = state.get("user_tier", "FREE")
    user_api_key = state.get("user_api_key")
    return user_id, user_tier, user_api_key


def get_user_api_key(user_id: str, user_tier: str) -> Optional[str]:
    """Get user's API key if they are in FREE tier"""
    if user_tier == "FREE":
        try:
            from database_operations import dbOps
            api_data = dbOps.getUserApiConfig(user_id)
            return api_data.get("apiKey") if api_data else None
        except Exception as e:
            console.print(f"[bold red]Error getting user API key: {e}[/bold red]")
            return None
    return None


def get_llm_for_task(
    task_name: str,
    temperature: float,
    user_id: str,
    user_tier: str,
    user_api_key: Optional[str],
):

    if user_tier == "FREE":
        if user_api_key:
            if task_name == "extract_info":
                return ChatOpenAI(
                    temperature=temperature, model="gpt-3.5-turbo", api_key=user_api_key
                )
            elif task_name == "edit_technical_skills":
                return ChatOpenAI(
                    temperature=temperature, model="gpt-4", api_key=user_api_key
                )
            elif task_name == "edit_experience":
                return ChatOpenAI(
                    temperature=temperature, model="gpt-4", api_key=user_api_key
                )
            elif task_name == "edit_projects":
                return ChatOpenAI(
                    temperature=temperature, model="gpt-4", api_key=user_api_key
                )
            elif task_name == "judge_quality":
                return ChatOpenAI(
                    temperature=temperature, model="gpt-4", api_key=user_api_key
                )
            elif task_name == "keywords_editor":
                return ChatOpenAI(
                    temperature=temperature, model="gpt-3.5-turbo", api_key=user_api_key
                )
        else:
            raise Exception(
                "API_KEY_ERROR: Please add your OpenAI API key in the API Config section to continue."
            )

    elif user_tier == "ADMI":
        if task_name == "extract_info":
            return ChatGoogleGenerativeAI(
                temperature=temperature,
                model="gemma-3-27b-it",
                google_api_key=GOOGLE_API_KEY,
            )
        elif task_name == "edit_technical_skills":
            return ChatGoogleGenerativeAI(
                temperature=temperature,
                model="gemini-2.0-flash-exp",
                google_api_key=GOOGLE_API_KEY,
            )
        elif task_name == "edit_experience":
            return ChatGroq(
                temperature=temperature,
                model_name="openai/gpt-oss-120b",
                api_key=GROQ_API_KEY,
            )
        elif task_name == "edit_projects":
            return ChatGroq(
                temperature=temperature,
                model_name="openai/gpt-oss-120b",
                api_key=GROQ_API_KEY,
            )
        elif task_name == "judge_quality":
            return ChatOpenRouter(
                temperature=temperature, model_name="moonshotai/kimi-k2:free"
            )
        elif task_name == "keywords_editor":
            return ChatGoogleGenerativeAI(
                temperature=temperature,
                model="gemma-3-27b-it",
                google_api_key=GOOGLE_API_KEY,
            )

    return ChatGoogleGenerativeAI(
        temperature=temperature, model="gemma-3-27b-it", google_api_key=GOOGLE_API_KEY
    )


def get_initial_data(state):
    console.print(
        Panel("Loading initial resume data...", title="Setup", border_style="green")
    )
    resume_data = state.get("resume_data")
    job_description = resume_data.get("jobDescription")
    tailored_resume_data = {
        k: v for k, v in resume_data.items() if k != "jobDescription"
    }

    # Get user API key if available
    user_id = state.get("user_id", "")
    user_tier = state.get("user_tier", "FREE")
    user_api_key = get_user_api_key(user_id, user_tier)

    return {
        "resume_data": resume_data,
        "job_description": job_description,
        "tailored_resume_data": tailored_resume_data,
        "iteration_count": 0,
        "user_id": user_id,
        "user_tier": user_tier,
        "user_api_key": user_api_key,
    }


def extract_info(state):
    console.print(
        Panel(
            "Extracting Company, Position, and Location...",
            title="Progress",
            border_style="blue",
        )
    )

    user_id, user_tier, user_api_key = get_user_context(state)

    try:
        llm = get_llm_for_task("extract_info", 0, user_id, user_tier, user_api_key)

        prompt = EXTRACT_INFO_PROMPT.format(job_description=state["job_description"])
        response = llm.invoke(prompt)

        try:
            data = extract_and_parse_json(response.content)
            company = data["company"]
            position = data["position"]
            location = data.get("location", "Open to Relocation")
        except (json.JSONDecodeError, KeyError):
            console.print(
                "[bold red]Error: Could not extract company, position, and location in expected JSON format. Setting to defaults.[/bold red]"
            )
            company = "Not Found"
            position = "Not Found"
            location = "Open to Relocation"

        console.log(company)
        console.log(position)
        console.log(location)
        return {"company_name": company, "position": position, "location": location}

    except Exception as e:
        error_msg = str(e)
        if user_tier == "FREE":
            if "api_key" in error_msg.lower() or "authentication" in error_msg.lower():
                console.print(
                    "[bold red]Error: Invalid or missing API key. Please add your OpenAI API key in the API Config section.[/bold red]"
                )
                raise Exception(
                    "API_KEY_ERROR: Please add your OpenAI API key in the API Config section to continue."
                )
            else:
                console.print(
                    f"[bold red]Error in extract_info: {error_msg}[/bold red]"
                )
                raise Exception(f"EXTRACT_INFO_ERROR: {error_msg}")
        else:
            # For ADMI tier, show generic model error
            console.print(
                f"[bold red]Error in extract_info with model: {error_msg}[/bold red]"
            )
            raise Exception(f"MODEL_ERROR: Error occurred in extract_info model")


def edit_technical_skills(state):
    console.print(
        Panel("Editing Technical Skills...", title="Progress", border_style="blue")
    )

    user_id, user_tier, user_api_key = get_user_context(state)

    try:
        llm = get_llm_for_task(
            "edit_technical_skills", 0.6, user_id, user_tier, user_api_key
        )

        original_skills_section = state["tailored_resume_data"].get(
            "technicalSkillsCategories"
        )

        feedback_context = ""
        if (
            state.get("feedback")
            and state.get("downsides")
            and state.get("iteration_count", 0) > 0
        ):
            feedback_context = FEEDBACK_CONTEXT_TEMPLATE.format(
                feedback=state.get("feedback", ""),
                downsides=state.get("downsides", ""),
                iteration_count=state.get("iteration_count", 0),
                section_name="Technical Skills",
            )

        prompt = EDIT_TECHNICAL_SKILLS_PROMPT.format(
            feedback_context=feedback_context,
            job_description=state["job_description"],
            original_skills_section=json.dumps(original_skills_section, indent=2),
        )

        response = llm.invoke(prompt)
        try:
            new_skills_section = extract_and_parse_json(response.content)
            updated_resume_data = state["tailored_resume_data"].copy()
            updated_resume_data["technicalSkillsCategories"] = new_skills_section
            return {"tailored_resume_data": updated_resume_data}
        except json.JSONDecodeError:
            console.print(
                "[bold yellow]Warning: Failed to extract JSON from LLM response for Technical Skills. Skipping update.[/bold yellow]"
            )
            return {"tailored_resume_data": state["tailored_resume_data"]}

    except Exception as e:
        error_msg = str(e)
        if user_tier == "FREE":
            if "api_key" in error_msg.lower() or "authentication" in error_msg.lower():
                console.print(
                    "[bold red]Error: Invalid or missing API key. Please add your OpenAI API key in the API Config section.[/bold red]"
                )
                raise Exception(
                    "API_KEY_ERROR: Please add your OpenAI API key in the API Config section to continue."
                )
            else:
                console.print(
                    f"[bold red]Error in edit_technical_skills: {error_msg}[/bold red]"
                )
                raise Exception(f"EDIT_SKILLS_ERROR: {error_msg}")
        else:
            # For ADMI tier, show generic model error
            console.print(
                f"[bold red]Error in edit_technical_skills with model: {error_msg}[/bold red]"
            )
            raise Exception(
                f"MODEL_ERROR: Error occurred in edit_technical_skills model"
            )


def edit_experience(state):
    console.print(Panel("Editing Experience...", title="Progress", border_style="blue"))

    user_id, user_tier, user_api_key = get_user_context(state)

    try:
        llm = get_llm_for_task("edit_experience", 0.3, user_id, user_tier, user_api_key)

        original_experience_section = state["tailored_resume_data"].get(
            "workExperience", []
        )

        feedback_context = ""
        if (
            state.get("feedback")
            and state.get("downsides")
            and state.get("iteration_count", 0) > 0
        ):
            feedback_context = FEEDBACK_CONTEXT_EXPERIENCE_TEMPLATE.format(
                feedback=state.get("feedback", ""),
                downsides=state.get("downsides", ""),
                iteration_count=state.get("iteration_count", 0),
                full_resume_data=json.dumps(state["tailored_resume_data"], indent=2),
            )

        prompt = EDIT_EXPERIENCE_PROMPT.format(
            feedback_context=feedback_context,
            job_description=state["job_description"],
            original_experience_section=json.dumps(
                original_experience_section, indent=2
            ),
        )

        response = llm.invoke(prompt)
        try:
            new_experience_section = extract_and_parse_json(response.content)
            updated_resume_data = state["tailored_resume_data"].copy()
            updated_resume_data["workExperience"] = new_experience_section
            return {"tailored_resume_data": updated_resume_data}
        except json.JSONDecodeError:
            console.print(
                "[bold yellow]Warning: Failed to extract JSON from LLM response for Work Experience. Skipping update.[/bold yellow]"
            )
            return {"tailored_resume_data": state["tailored_resume_data"]}

    except Exception as e:
        error_msg = str(e)
        if user_tier == "FREE":
            if "api_key" in error_msg.lower() or "authentication" in error_msg.lower():
                console.print(
                    "[bold red]Error: Invalid or missing API key. Please add your OpenAI API key in the API Config section.[/bold red]"
                )
                raise Exception(
                    "API_KEY_ERROR: Please add your OpenAI API key in the API Config section to continue."
                )
            else:
                console.print(
                    f"[bold red]Error in edit_experience: {error_msg}[/bold red]"
                )
                raise Exception(f"EDIT_EXPERIENCE_ERROR: {error_msg}")
        else:
            # For ADMI tier, show generic model error
            console.print(
                f"[bold red]Error in edit_experience with model: {error_msg}[/bold red]"
            )
            raise Exception(f"MODEL_ERROR: Error occurred in edit_experience model")


def edit_projects(state):
    console.print(Panel("Editing Projects...", title="Progress", border_style="blue"))

    user_id, user_tier, user_api_key = get_user_context(state)

    try:
        llm = get_llm_for_task("edit_projects", 0.3, user_id, user_tier, user_api_key)

        original_projects_section = state["tailored_resume_data"].get("projects", [])

        feedback_context = ""
        if (
            state.get("feedback")
            and state.get("downsides")
            and state.get("iteration_count", 0) > 0
        ):
            feedback_context = FEEDBACK_CONTEXT_PROJECTS_TEMPLATE.format(
                feedback=state.get("feedback", ""),
                downsides=state.get("downsides", ""),
                iteration_count=state.get("iteration_count", 0),
                full_resume_data=json.dumps(state["tailored_resume_data"], indent=2),
            )

        prompt = EDIT_PROJECTS_PROMPT.format(
            feedback_context=feedback_context,
            job_description=state["job_description"],
            original_projects_section=json.dumps(original_projects_section, indent=2),
        )

        response = llm.invoke(prompt)
        try:
            new_projects_section = extract_and_parse_json(response.content)
            updated_resume_data = state["tailored_resume_data"].copy()
            updated_resume_data["projects"] = new_projects_section
            return {"tailored_resume_data": updated_resume_data}
        except json.JSONDecodeError:
            console.print(
                "[bold yellow]Warning: Failed to extract JSON from LLM response for Projects. Skipping update.[/bold yellow]"
            )
            return {"tailored_resume_data": state["tailored_resume_data"]}

    except Exception as e:
        error_msg = str(e)
        if user_tier == "FREE":
            if "api_key" in error_msg.lower() or "authentication" in error_msg.lower():
                console.print(
                    "[bold red]Error: Invalid or missing API key. Please add your OpenAI API key in the API Config section.[/bold red]"
                )
                raise Exception(
                    "API_KEY_ERROR: Please add your OpenAI API key in the API Config section to continue."
                )
            else:
                console.print(
                    f"[bold red]Error in edit_projects: {error_msg}[/bold red]"
                )
                raise Exception(f"EDIT_PROJECTS_ERROR: {error_msg}")
        else:
            # For ADMI tier, show generic model error
            console.print(
                f"[bold red]Error in edit_projects with model: {error_msg}[/bold red]"
            )
            raise Exception(f"MODEL_ERROR: Error occurred in edit_projects model")


def judge_resume_quality(state):
    console.print(
        Panel("Judging Resume Quality...", title="Progress", border_style="blue")
    )

    user_id, user_tier, user_api_key = get_user_context(state)

    try:
        llm = get_llm_for_task("judge_quality", 0.1, user_id, user_tier, user_api_key)
        iteration_count = state.get("iteration_count", 0) + 1

        prompt = JUDGE_QUALITY_PROMPT.format(
            job_description=state["job_description"],
            tailored_resume_data=json.dumps(state["tailored_resume_data"], indent=2),
        )

        response = llm.invoke(prompt)
        data = extract_and_parse_json(response.content)

        if data:
            score = data.get("score", 0.0)
            feedback = data.get("feedback", "No specific feedback provided.")
            downsides = data.get("downsides", "No specific downsides provided.")
        else:
            console.print(
                "[bold red]Error: Could not parse LLM feedback. Defaulting score to 0 and providing generic feedback.[/bold red]"
            )
            score = 0.0
            feedback = (
                "LLM feedback parsing failed. Please check the LLM response format."
            )
            downsides = "Failed to parse LLM feedback."

        console.print(f"[bold green]Resume Quality Score: {score}/10[/bold green]")
        console.print(f"[bold yellow]Feedback: {feedback}[/bold yellow]")
        console.print(f"[bold red]Downsides: {downsides}[/bold red]")

        return {
            "score": score,
            "feedback": feedback,
            "iteration_count": iteration_count,
            "downsides": downsides,
        }

    except Exception as e:
        error_msg = str(e)
        if user_tier == "FREE":
            if "api_key" in error_msg.lower() or "authentication" in error_msg.lower():
                console.print(
                    "[bold red]Error: Invalid or missing API key. Please add your OpenAI API key in the API Config section.[/bold red]"
                )
                raise Exception(
                    "API_KEY_ERROR: Please add your OpenAI API key in the API Config section to continue."
                )
            else:
                console.print(
                    f"[bold red]Error in judge_resume_quality: {error_msg}[/bold red]"
                )
                raise Exception(f"JUDGE_QUALITY_ERROR: {error_msg}")
        else:
            # For ADMI tier, show generic model error
            console.print(
                f"[bold red]Error in judge_resume_quality with model: {error_msg}[/bold red]"
            )
            raise Exception(
                f"MODEL_ERROR: Error occurred in judge_resume_quality model"
            )


def keywords_editor(state):
    console.print(
        Panel(
            "Finding and embedding keywords...", title="Progress", border_style="blue"
        )
    )

    user_id, user_tier, user_api_key = get_user_context(state)

    try:
        llm = get_llm_for_task("keywords_editor", 0, user_id, user_tier, user_api_key)

        job_description = state["job_description"]
        resume_data = state["tailored_resume_data"]

        prompt = KEYWORDS_EXTRACTION_PROMPT.format(
            job_description=job_description,
            resume_data=json.dumps(resume_data, indent=2),
        )
        response = llm.invoke(prompt)
        keywords_data = extract_and_parse_json(response.content)
        if not keywords_data or "keywords" not in keywords_data:
            console.print(
                "[bold yellow]Warning: Could not parse keywords from LLM response. Keywords not embedded.[/bold yellow]"
            )
            return {"tailored_resume_data": resume_data}

        keywords = ", ".join(keywords_data["keywords"])
        updated_resume_data = resume_data.copy()
        updated_resume_data["invisibleKeywords"] = keywords

        return {"tailored_resume_data": updated_resume_data}

    except Exception as e:
        error_msg = str(e)
        if user_tier == "FREE":
            if "api_key" in error_msg.lower() or "authentication" in error_msg.lower():
                console.print(
                    "[bold red]Error: Invalid or missing API key. Please add your OpenAI API key in the API Config section.[/bold red]"
                )
                raise Exception(
                    "API_KEY_ERROR: Please add your OpenAI API key in the API Config section to continue."
                )
            else:
                console.print(
                    f"[bold red]Error in keywords_editor: {error_msg}[/bold red]"
                )
                raise Exception(f"KEYWORDS_EDITOR_ERROR: {error_msg}")
        else:
            # For ADMI tier, show generic model error
            console.print(
                f"[bold red]Error in keywords_editor with model: {error_msg}[/bold red]"
            )
            raise Exception(f"MODEL_ERROR: Error occurred in keywords_editor model")


def finalize_and_print_json(state):
    console.print(
        Panel("Finalizing Processed Resume...", title="Complete", border_style="green")
    )
    final_json = state["tailored_resume_data"]

    full_final_json = state["resume_data"].copy()
    full_final_json["resumeData"] = final_json
    full_final_json["jobDescription"] = state["job_description"]
    full_final_json["status"] = "processed"

    # Include location in the final output
    full_final_json["location"] = state.get("location", "Open to Relocation")

    # Removed verbose JSON output - using summary instead
    console.print(
        f"[green]✓ Resume processing completed. Session: {full_final_json.get('sessionId', 'N/A')}[/green]"
    )
    return {"tailored_resume_data": full_final_json}


def decide_after_judging(state):
    if state["score"] < DECIDING_SCORE and state["iteration_count"] < 3:
        console.print(
            Panel(
                f"Score {state['score']}/10 is below threshold ({DECIDING_SCORE}). Re-editing technical skills. Iteration: {state['iteration_count']}",
                title="Decision",
                border_style="red",
            )
        )
        return "edit_technical_skills"
    else:
        console.print(
            Panel(
                f"Score {state['score']}/10 is sufficient (threshold: {DECIDING_SCORE}) or max iterations reached. Proceeding to finalize. Iteration: {state['iteration_count']}",
                title="Decision",
                border_style="green",
            )
        )
        return "keywords_editor"


def workflow(inputs):
    workflow = StateGraph(AgentState)

    workflow.add_node("get_initial_data", get_initial_data)
    workflow.add_node("extract_info", extract_info)
    workflow.add_node("edit_technical_skills", edit_technical_skills)
    workflow.add_node("edit_experience", edit_experience)
    workflow.add_node("edit_projects", edit_projects)
    workflow.add_node("judge_resume_quality", judge_resume_quality)
    workflow.add_node("keywords_editor", keywords_editor)
    workflow.add_node("finalize_and_print_json", finalize_and_print_json)

    workflow.set_entry_point("get_initial_data")
    workflow.add_edge("get_initial_data", "extract_info")
    workflow.add_edge("extract_info", "edit_technical_skills")
    workflow.add_edge("edit_technical_skills", "edit_experience")
    workflow.add_edge("edit_experience", "edit_projects")
    workflow.add_edge("edit_projects", "judge_resume_quality")

    workflow.add_conditional_edges(
        "judge_resume_quality",
        decide_after_judging,
        {
            "edit_technical_skills": "edit_technical_skills",
            "keywords_editor": "keywords_editor",
        },
    )
    workflow.add_edge("keywords_editor", "finalize_and_print_json")
    workflow.add_edge("finalize_and_print_json", END)

    app = workflow.compile()
    result = app.invoke(inputs)
    return result

import json, os, re
from typing import TypedDict, Dict, Any
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


def get_initial_data(state):
    console.print(
        Panel("Loading initial resume data...", title="Setup", border_style="green")
    )
    resume_data = state.get("resume_data")
    job_description = resume_data.get("jobDescription")
    tailored_resume_data = {
        k: v for k, v in resume_data.items() if k != "jobDescription"
    }
    return {
        "resume_data": resume_data,
        "job_description": job_description,
        "tailored_resume_data": tailored_resume_data,
        "iteration_count": 0,
    }


def extract_info(state):
    console.print(
        Panel(
            "Extracting Company, Position, and Location...",
            title="Progress",
            border_style="blue",
        )
    )
    llm = ChatGoogleGenerativeAI(
        temperature=0, model="gemma-3-27b-it", google_api_key=GOOGLE_API_KEY
    )
    # llm = ChatOpenAI(temperature=0, model="gpt-3.5-turbo", api_key=OPENAI_API_KEY)

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


def edit_technical_skills(state):
    console.print(
        Panel("Editing Technical Skills...", title="Progress", border_style="blue")
    )
    llm = ChatGoogleGenerativeAI(
        temperature=0.6, model="gemma-3-27b-it", google_api_key=GOOGLE_API_KEY
    )
    # llm = ChatOpenAI(temperature=0.6, model="gpt-4", api_key=OPENAI_API_KEY)

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


def edit_experience(state):
    console.print(Panel("Editing Experience...", title="Progress", border_style="blue"))
    llm = ChatGroq(
        temperature=0.3, model_name="llama-3.3-70b-versatile", api_key=GROQ_API_KEY
    )
    # llm = ChatOpenAI(temperature=0.7, model="gpt-4", api_key=OPENAI_API_KEY)

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
        original_experience_section=json.dumps(original_experience_section, indent=2),
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


def edit_projects(state):
    console.print(Panel("Editing Projects...", title="Progress", border_style="blue"))
    llm = ChatGroq(
        temperature=0.3, model_name="llama-3.3-70b-versatile", api_key=GROQ_API_KEY
    )
    # llm = ChatOpenAI(temperature=0.3, model="gpt-4", api_key=OPENAI_API_KEY)

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


def judge_resume_quality(state):
    console.print(
        Panel("Judging Resume Quality...", title="Progress", border_style="blue")
    )
    llm = ChatOpenRouter(temperature=0.1, model_name="qwen/qwen3-235b-a22b:free")
    # llm = ChatGoogleGenerativeAI(
    #     temperature=0.1, model="gemma-3-27b-it", google_api_key=GOOGLE_API_KEY
    # )
    # llm = ChatOpenAI(temperature=0.1, model="gpt-4", api_key=OPENAI_API_KEY)
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
        feedback = "LLM feedback parsing failed. Please check the LLM response format."
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


def keywords_editor(state):
    console.print(
        Panel(
            "Finding and embedding keywords...", title="Progress", border_style="blue"
        )
    )
    llm = ChatGoogleGenerativeAI(
        temperature=0, model="gemma-3-27b-it", google_api_key=GOOGLE_API_KEY
    )
    # llm = ChatOpenAI(temperature=0, model="gpt-3.5-turbo", api_key=OPENAI_API_KEY)

    job_description = state["job_description"]
    resume_data = state["tailored_resume_data"]

    prompt = KEYWORDS_EXTRACTION_PROMPT.format(
        job_description=job_description, resume_data=json.dumps(resume_data, indent=2)
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
    if state["score"] < 8.6 and state["iteration_count"] < 3:
        console.print(
            Panel(
                f"Score {state['score']}/10 is below threshold. Re-editing technical skills. Iteration: {state['iteration_count']}",
                title="Decision",
                border_style="red",
            )
        )
        return "edit_technical_skills"
    else:
        console.print(
            Panel(
                f"Score {state['score']}/10 is sufficient or max iterations reached. Proceeding to finalize. Iteration: {state['iteration_count']}",
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

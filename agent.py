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
    console.print(Panel("Loading initial resume data...", title="Setup", border_style="green"))
    resume_data = state.get("resume_data")
    job_description = resume_data.get("jobDescription")
    tailored_resume_data = {k: v for k, v in resume_data.items() if k != "jobDescription"}
    return {
        "resume_data": resume_data,
        "job_description": job_description,
        "tailored_resume_data": tailored_resume_data,
        "iteration_count": 0,
}

def extract_info(state):
    console.print(Panel("Extracting Company, Position, and Location...", title="Progress", border_style="blue"))
    llm = ChatOpenAI(temperature=0, model="gpt-3.5-turbo", api_key=OPENAI_API_KEY)

    prompt = f"""From the following job description, extract the company name, the position title, and the job location.
                Format the location as "City, ST" (e.g., "Los Angeles, CA", "New York, NY").
                Return ONLY the JSON object, with three keys: "company", "position", and "location". Do NOT include any other text or markdown.
                If the location is not specified, default to "Open to Relocation".

                Job Description:
                {state['job_description']}
            """
    response = llm.invoke(prompt)
    try:
        data = extract_and_parse_json(response.content)
        company = data["company"]
        position = data["position"]
        location = data.get("location", "Open to Relocation")
    except (json.JSONDecodeError, KeyError):
        console.print("[bold red]Error: Could not extract company, position, and location in expected JSON format. Setting to defaults.[/bold red]")
        company = "Not Found"
        position = "Not Found"
        location = "Open to Relocation"
    console.log(company)
    console.log(position)
    console.log(location)
    return {"company_name": company, "position": position, "location": location}

def edit_technical_skills(state):
    console.print(Panel("Editing Technical Skills...", title="Progress", border_style="blue"))
    llm = ChatOpenAI(temperature=0.6, model="gpt-4", api_key=OPENAI_API_KEY)

    original_skills_section = state["tailored_resume_data"].get("technicalSkillsCategories")

    feedback_context = ""
    if state.get("feedback") and state.get("downsides") and state.get("iteration_count", 0) > 0:
        feedback_context = f"""
                    **Previous Feedback and Context:**
                    - **Feedback from previous iteration:** {state.get("feedback", "")}
                    - **Identified downsides to address:** {state.get("downsides", "")}
                    - **Current iteration:** {state.get("iteration_count", 0)}

                    Please specifically address the feedback and downsides mentioned above while making improvements to the Technical Skills section.
                """

    prompt = f"""You are an elite Resume Architect. Your sole function is to transform a generic JSON resume into a highly targeted application for a specific job description.

            {feedback_context}

            Rewrite the 'technicalSkillsCategories' section of the resume to align with the job description. Follow these rules:
            - You can use the skills from the job description as a reference to add more skills to the resume.
            - Add any crucial skills from the job description that are missing.
            - Remove any skills that are irrelevant to the target job to reduce clutter and improve focus.

            Your output MUST be ONLY the updated JSON for the 'technicalSkillsCategories' section, wrapped in a single block like this: ``json ... ```

            **Job Description:**
            ---
            {state['job_description']}
            ---

            **Original 'technicalSkillsCategories' JSON Section:**
            ---
            {json.dumps(original_skills_section, indent=2)}
            ---
        """

    response = llm.invoke(prompt)
    try:
        new_skills_section = extract_and_parse_json(response.content)
        updated_resume_data = state["tailored_resume_data"].copy()
        updated_resume_data["technicalSkillsCategories"] = new_skills_section
        return {"tailored_resume_data": updated_resume_data}
    except json.JSONDecodeError:
        console.print("[bold yellow]Warning: Failed to extract JSON from LLM response for Technical Skills. Skipping update.[/bold yellow]")
        return {"tailored_resume_data": state["tailored_resume_data"]}

def edit_experience(state):
    console.print(Panel("Editing Experience...", title="Progress", border_style="blue"))
    llm = ChatOpenAI(temperature=0.7, model="gpt-4", api_key=OPENAI_API_KEY)

    original_experience_section = state["tailored_resume_data"].get("workExperience", [])

    feedback_context = ""
    if state.get("feedback") and state.get("downsides") and state.get("iteration_count", 0) > 0:
        feedback_context = f"""
            **Previous Feedback and Context:**
            - **Feedback from previous iteration:** {state.get("feedback", "")}
            - **Identified downsides to address:** {state.get("downsides", "")}
            - **Current iteration:** {state.get("iteration_count", 0)}
            
            **Here is entire resume for your reference:** 
            {json.dumps(state["tailored_resume_data"], indent=2)}

            Please specifically address the feedback and downsides mentioned above while making improvements to the Work Experience section.
        """

    prompt = f"""You are an elite Resume Architect. Your sole function is to transform a JSON resume into a highly targeted application for a specific job description.

        {feedback_context}

        Rewrite the bullet points in the 'workExperience' section of the JSON resume to be achievement-oriented, using the STAR (Situation, Task, Action, Result) or XYZ (Accomplished [X] as measured by [Y], by doing [Z]) framework. Follow these rules:
        - Quantify where ever or when ever possible. If the original experience lacks metrics, infer and add plausible, impressive metrics that align with the role's responsibilities.
        - Seamlessly and naturally integrate keywords and concepts from the job description throughout the narrative.
        - To bold keywords, use markdown like **keyword**.
        - Critical: Only make the change if it makes sense technically or logically.
        - You can add more details and points if needed to make the experience more relevant to the job description.
        - If change is needed in the experience to convey the narrative better, then change the entire experience point except the company name and the position title.
        - Do not Over describe the point e.g. "as mesaured by".
        - Start with Strong action verb and try to reduce use of articles.
        Your output MUST be ONLY the updated JSON for the 'workExperience' section, wrapped in a single block like this: ``json ... ```

        **Job Description:**
        ---
        {state['job_description']}
        ---

        **Original 'workExperience' JSON Section:**
        ---
        {json.dumps(original_experience_section, indent=2)}
        ---
    """

    response = llm.invoke(prompt)
    try:
        new_experience_section = extract_and_parse_json(response.content)
        updated_resume_data = state["tailored_resume_data"].copy()
        updated_resume_data["workExperience"] = new_experience_section
        return {"tailored_resume_data": updated_resume_data}
    except json.JSONDecodeError:
        console.print("[bold yellow]Warning: Failed to extract JSON from LLM response for Work Experience. Skipping update.[/bold yellow]")
        return {"tailored_resume_data": state["tailored_resume_data"]}

def edit_projects(state):
    console.print(Panel("Editing Projects...", title="Progress", border_style="blue"))
    llm = ChatOpenAI(temperature=0.3, model="gpt-4", api_key=OPENAI_API_KEY)

    original_projects_section = state["tailored_resume_data"].get("projects", [])

    feedback_context = ""
    if state.get("feedback") and state.get("downsides") and state.get("iteration_count", 0) > 0:
        feedback_context = f"""
            **Previous Feedback and Context:**
            - **Feedback from previous iteration:** {state.get("feedback", "")}
            - **Identified downsides to address:** {state.get("downsides", "")}
            - **Current iteration:** {state.get("iteration_count", 0)}

            **Here is entire resume for your reference:** 
            {json.dumps(state["tailored_resume_data"], indent=2)}
            Please specifically address the feedback and downsides mentioned above while making improvements to the Projects section.
        """

    prompt = f"""You are an elite Resume Architect. Your sole function is to transform a JSON resume into a highly targeted application for a specific job description.

        {feedback_context}

        Rewrite the bullet points in the 'projects' section of the JSON resume to be achievement-oriented, using the STAR (Situation, Task, Action, Result) or XYZ (Accomplished [X] as measured by [Y], by doing [Z]) framework. Follow these rules:
        - Quantify where ever or when ever possible. If the original resume lacks metrics, infer and add plausible, impressive metrics that align with the role's responsibilities.
        - Seamlessly and naturally integrate keywords and concepts from the job description throughout the narrative.
        - To bold keywords, use markdown like **keyword**.
        - You can add more details and points if needed to make the project more relevant to the job description.
        - You can add more points to the existing project if needed to make it more relevant to the job description but make sense and be cohesive.
        - You cannot change the project title, only the bullet points.

        Your output MUST be ONLY the updated JSON for the 'projects' section, wrapped in a single block like this: ``json ... ```

        **Job Description:**
        ---
        {state['job_description']}
        ---

        **Original 'projects' JSON Section:**
        ---
        {json.dumps(original_projects_section, indent=2)}
        ---
    """

    response = llm.invoke(prompt)
    try:
        new_projects_section = extract_and_parse_json(response.content)
        updated_resume_data = state["tailored_resume_data"].copy()
        updated_resume_data["projects"] = new_projects_section
        return {"tailored_resume_data": updated_resume_data}
    except json.JSONDecodeError:
        console.print("[bold yellow]Warning: Failed to extract JSON from LLM response for Projects. Skipping update.[/bold yellow]")
        return {"tailored_resume_data": state["tailored_resume_data"]}

def judge_resume_quality(state):
    console.print(Panel("Judging Resume Quality...", title="Progress", border_style="blue"))
    # llm = ChatOpenRouter(temperature=0.1, model_name="qwen/qwen3-235b-a22b:free")
    llm = ChatOpenAI(temperature=0.1, model="gpt-4", api_key=OPENAI_API_KEY)
    iteration_count = state.get("iteration_count", 0) + 1

    prompt = f"""You are an expert resume reviewer and critic. Your task is to evaluate how well the provided JSON resume is tailored to the given job description. Assign a score from 0 to 100, where 100 is perfectly tailored.
                Consider the following:
                - Relevance of experience and projects only to the job description.
                - Use of keywords from the job description.
                - Quantification of achievements (STAR/XYZ method).
                - Overall impact and alignment with the job requirements.
                - Judge the overall narrative of the resume and the flow of the resume.
                - Specify the downsides or drawbacks of the resume and specifically the resume section that can be better aligned with the job description.
                - Be genuine and honest in your evaluation.

                Provide your evaluation and score in a JSON object with three keys: "score" (float), "feedback" (string), and "downsides" (string).

                **Job Description:**
                ---
                {state['job_description']}
                ---

                **Tailored JSON Resume:**
                ---
                {json.dumps(state['tailored_resume_data'], indent=2)}
                ---
            """

    response = llm.invoke(prompt)
    data = extract_and_parse_json(response.content)

    if data:
        score = data.get("score", 0.0)
        feedback = data.get("feedback", "No specific feedback provided.")
        downsides = data.get("downsides", "No specific downsides provided.")
    else:
        console.print("[bold red]Error: Could not parse LLM feedback. Defaulting score to 0 and providing generic feedback.[/bold red]")
        score = 0.0
        feedback = "LLM feedback parsing failed. Please check the LLM response format."
        downsides = "Failed to parse LLM feedback."

    console.print(f"[bold green]Resume Quality Score: {score}/100[/bold green]")
    console.print(f"[bold yellow]Feedback: {feedback}[/bold yellow]")
    console.print(f"[bold red]Downsides: {downsides}[/bold red]")

    return {"score": score, "feedback": feedback, "iteration_count": iteration_count, "downsides": downsides}

def keywords_editor(state):
    console.print(Panel("Finding and embedding keywords...", title="Progress", border_style="blue"))
    # llm = ChatGoogleGenerativeAI(temperature=0, model="gemini-1.5-flash", google_api_key=GOOGLE_API_KEY)
    llm = ChatOpenAI(temperature=0, model="gpt-3.5-turbo", api_key=OPENAI_API_KEY)
    
    job_description = state["job_description"]
    resume_data = state["tailored_resume_data"]

    prompt = f"""
    Based on the job description and the resume, identify the 15 most important keywords that align the candidate's skills and experience with the job requirements.
    The keywords should be single words or short phrases (e.g., "Python", "Data Analysis", "Machine Learning").
    Return ONLY a JSON object with a single key "keywords" which is a list of these 15 keywords. Do not include any other text, labels, or markdown.

    **Job Description:**
    ---
    {job_description}
    ---

    **Resume JSON:**
    ---
    {json.dumps(resume_data, indent=2)}
    ---
    """
    response = llm.invoke(prompt)
    keywords_data = extract_and_parse_json(response.content)
    if not keywords_data or "keywords" not in keywords_data:
        console.print("[bold yellow]Warning: Could not parse keywords from LLM response. Keywords not embedded.[/bold yellow]")
        return {"tailored_resume_data": resume_data}

    keywords = ", ".join(keywords_data["keywords"])
    updated_resume_data = resume_data.copy()
    updated_resume_data["invisibleKeywords"] = keywords
    
    return {"tailored_resume_data": updated_resume_data}

def finalize_and_print_json(state):
    console.print(Panel("Finalizing Processed Resume...", title="Complete", border_style="green"))
    final_json = state["tailored_resume_data"]
    
    full_final_json = state["resume_data"].copy()
    full_final_json["resumeData"] = final_json
    full_final_json["jobDescription"] = state["job_description"]
    full_final_json["status"] = "processed"
    
    console.print(json.dumps(full_final_json, indent=2))
    return {"tailored_resume_data": full_final_json}


def decide_after_judging(state):
    if state["score"] < 80 and state["iteration_count"] < 3:
        console.print(Panel(f"Score {state['score']}/100 is below threshold. Re-editing technical skills. Iteration: {state['iteration_count']}", title="Decision", border_style="red"))
        return "edit_technical_skills"
    else:
        console.print(Panel(f"Score {state['score']}/100 is sufficient or max iterations reached. Proceeding to finalize. Iteration: {state['iteration_count']}", title="Decision", border_style="green"))
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
        }
    )
    workflow.add_edge("keywords_editor","finalize_and_print_json")
    workflow.add_edge("finalize_and_print_json", END)

    app = workflow.compile()
    result = app.invoke(inputs)
    return result



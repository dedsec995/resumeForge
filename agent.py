import json, os, re
from typing import TypedDict
from langchain_core.runnables.graph_mermaid import draw_mermaid_png
from langchain_groq import ChatGroq
from langgraph.graph import StateGraph, END
from langchain_google_genai import ChatGoogleGenerativeAI
from openrouter import ChatOpenRouter
from rich.console import Console
from rich.panel import Panel
from dotenv import load_dotenv
from latex2pdf import compile_latex
from utils import clean_the_text, extract_and_parse_json
import pyperclip

load_dotenv()

GROQ_API_KEY = os.getenv("GROQ_API_KEY")
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")
console = Console()

class AgentState(TypedDict):
    resume: str
    job_description: str
    company_name: str
    position: str
    location: str
    tailored_resume: str
    pdf_path: str
    score: float
    feedback: str
    downsides: str
    iteration_count: int

def get_resume_content(file_path="template/resume.tex"):
    with open(file_path, "r") as f:
        return f.read()

def get_job_description(state):
    console.print(Panel("Please copy the job description to your clipboard", title="Job Description", border_style="green"))
    console.print("[bold cyan]1. Copy the job description from the website/document[/bold cyan]")
    console.print("[bold cyan]2. Press Enter when ready...[/bold cyan]")
    
    input()
    
    try:
        job_description = pyperclip.paste().strip()
                
        debug_preview = job_description[:50] + "..." if len(job_description) > 50 else job_description
        console.print(f"[dim]Debug - Clipboard content (first 50 chars): {repr(debug_preview)}[/dim]")

        if not job_description or "Clipboard is empty" in job_description or "Error" in job_description:
            console.print("[bold red]Issue detected with clipboard content![/bold red]")
            console.print("[bold yellow]Please copy the job description again using Ctrl+C and press Enter...[/bold yellow]")
            console.print("[dim]Make sure you're copying from the actual job posting, not from this terminal[/dim]")
            input()
            job_description = pyperclip.paste().strip()
        
        if len(job_description) < 100:
            console.print(f"[bold yellow]Warning: Clipboard content is quite short ({len(job_description)} chars).[/bold yellow]")
            console.print("Is this the complete job description? (y/n): ", end="")
            confirmation = input().lower().strip()
            if confirmation not in ['y', 'yes']:
                console.print("Please copy the complete job description and press Enter...")
                input()
                job_description = pyperclip.paste().strip()
        
        if job_description:
            preview = job_description[:300] + "..." if len(job_description) > 300 else job_description
            console.print(Panel(f"[bold green]Job description copied successfully![/bold green]\n\n[bold]Length:[/bold] {len(job_description)} characters\n\n[bold]Preview:[/bold]\n{preview}", title="Success", border_style="green"))
        else:
            console.print("[bold red]Still no valid content in clipboard. Please check and try again.[/bold red]")
            return {"job_description": "", "resume": get_resume_content()}
        
    except Exception as e:
        console.print(f"[bold red]Error accessing clipboard: {e}[/bold red]")
        console.print("Please ensure you're running in a proper terminal environment.")
        return {"job_description": "", "resume": get_resume_content()}
    
    return {"job_description": job_description, "resume": get_resume_content()}

def extract_info(state):
    console.print(Panel("Extracting Company, Position, and Location...", title="Progress", border_style="blue"))
    # llm = ChatGroq(temperature=0, model_name="llama-3.3-70b-versatile", api_key = GROQ_API_KEY)
    llm = ChatGoogleGenerativeAI(temperature=0, model="gemma-3-27b-it", google_api_key=GOOGLE_API_KEY)

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

    resume_content = state['resume']
    updated_resume = resume_content.replace("{\\faGlobe\\ {Open to Relocation}}", f"{{{{\\faGlobe\\ {{{location}}}}}")


    return {"company_name": company, "position": position, "location": location, "tailored_resume": updated_resume}

def edit_technical_skills(state):
    console.print(Panel("Editing Technical Skills...", title="Progress", border_style="blue"))
    # llm = ChatGroq(temperature=0.6, model_name="llama-3.3-70b-versatile", api_key = GROQ_API_KEY)
    llm = ChatGoogleGenerativeAI(temperature=0.6, model="gemma-3-27b-it", google_api_key=GOOGLE_API_KEY)
    resume_content = state["tailored_resume"]

    skills_section_regex = r"(\\section{Technical Skills}.*?\\vspace{-13pt})"
    match = re.search(skills_section_regex, resume_content, re.DOTALL)
    if not match:
        console.print("[bold red]Error: Could not find the Technical Skills section.[/bold red]")
        return {"tailored_resume": resume_content}
    original_skills_section = match.group(1)

    feedback_context = ""
    if state.get("feedback") and state.get("downsides") and state.get("iteration_count", 0) > 0:
        feedback_context = f"""
                    **Previous Feedback and Context:**
                    - **Feedback from previous iteration:** {state.get("feedback", "")}
                    - **Identified downsides to address:** {state.get("downsides", "")}
                    - **Current iteration:** {state.get("iteration_count", 0)}

                    Please specifically address the feedback and downsides mentioned above while making improvements to the Technical Skills section.
                """

    prompt = f"""You are an elite Resume Architect and LaTeX specialist. Your sole function is to transform a generic LaTeX resume into a highly targeted application for a specific job description.

            {feedback_context}

            Rewrite the 'Technical Skills' section below to align with the job description. Follow these rules:
            - You can use the skills from the job description as a reference to add more skills to the resume.
            - Add any crucial skills from the job description that are missing.
            - Remove any skills that are irrelevant to the target job to reduce clutter and improve focus.
            - Do NOT use `the textbf{{}}` command to bold any skills in this section. Do not remove exisiting `textbf{{}}`
            - Do not change certfications, leave them as they are.

            Your output MUST be ONLY the updated LaTeX code for the 'Technical Skills' section, wrapped in a single markdown block like this: ```latex [your code here] ```.

            **Job Description:**
            ---
            {state['job_description']}
            ---

            **Original LaTeX 'Technical Skills' Section:**
            ---
            {original_skills_section}
            ---
        """

    response = llm.invoke(prompt)
    new_skills_section = clean_the_text(response.content)

    if new_skills_section:
        updated_resume = re.sub(skills_section_regex, lambda m: new_skills_section, resume_content, flags=re.DOTALL)
        return {"tailored_resume": updated_resume}
    else:
        console.print("[bold yellow]Warning: Failed to extract LaTeX from LLM response for Technical Skills. Skipping update.[/bold yellow]")
        return {"tailored_resume": resume_content}

def edit_experience(state):
    console.print(Panel("Editing Experience...", title="Progress", border_style="blue"))
    llm = ChatGroq(temperature=0.7, model_name="llama-3.3-70b-versatile", api_key = GROQ_API_KEY)
    resume_content = state["tailored_resume"]

    experience_section_regex = r"(\\section{Work Experience}.*?\\vspace{-12pt})"
    match = re.search(experience_section_regex, resume_content, re.DOTALL)
    if not match:
        console.print("[bold red]Error: Could not find the Work Experience section.[/bold red]")
        return {"tailored_resume": resume_content}
    original_experience_section = match.group(1)

    feedback_context = ""
    if state.get("feedback") and state.get("downsides") and state.get("iteration_count", 0) > 0:
        feedback_context = f"""
            **Previous Feedback and Context:**
            - **Feedback from previous iteration:** {state.get("feedback", "")}
            - **Identified downsides to address:** {state.get("downsides", "")}
            - **Current iteration:** {state.get("iteration_count", 0)}
            
            **Here is entire resume for your reference:** 
            {state["tailored_resume"]}

            Please specifically address the feedback and downsides mentioned above while making improvements to the Work Experience section.
        """

    prompt = f"""You are an elite Resume Architect and LaTeX specialist. Your sole function is to transform a LaTeX resume into a highly targeted application for a specific job description.

        {feedback_context}

        Rewrite the bullet points in the LaTeX 'Work Experience' section below to be achievement-oriented, using the STAR (Situation, Task, Action, Result) or XYZ (Accomplished [X] as measured by [Y], by doing [Z]) framework. Follow these rules:
        - Quantify where ever or when ever possible. If the original experience lacks metrics, infer and add plausible, impressive metrics that align with the role's responsibilities.
        - Seamlessly and naturally integrate keywords and concepts from the job description throughout the narrative.
        - Use the `textbf{{}}` command to bold the most critical keywords that directly match the job description.
        - This is LaTeX code. Use ONLY `\\textbf{{keyword}}` to bold keywords. NEVER use **keyword** or __keyword__ markdown formatting.
        - Critical: Only make the change if it makes sense technically or logically.
        - You can add more details and points if needed to make the experience more relevant to the job description.
        - If change is needed in the experience to convey the narrative better, then change the entire experience point except the company name and the position title.
        - Do not Over describe the point e.g. "as mesaured by".
        - Start with Strong action verb and try to reduce use of articles.
        Your output MUST be ONLY the updated LaTeX code for the 'Work Experience' section, wrapped in a single markdown block like this: ```latex [your code here] ```.

        **Job Description:**
        ---
        {state['job_description']}
        ---

        **Original LaTeX 'Work Experience' Section:**
        ---
        {original_experience_section}
        ---
    """

    response = llm.invoke(prompt)
    new_experience_section = clean_the_text(response.content)

    if new_experience_section:
        updated_resume = re.sub(experience_section_regex, lambda m: new_experience_section, resume_content, flags=re.DOTALL)
        return {"tailored_resume": updated_resume}
    else:
        console.print("[bold yellow]Warning: Failed to extract LaTeX from LLM response for Work Experience. Skipping update.[/bold yellow]")
        return {"tailored_resume": resume_content}

def edit_projects(state):
    console.print(Panel("Editing Projects...", title="Progress", border_style="blue"))
    llm = ChatGroq(temperature=0.3, model_name="llama-3.3-70b-versatile", api_key = GROQ_API_KEY)
    resume_content = state["tailored_resume"]

    projects_section_regex = r"(\\section{Projects}.*?\\resumeSubHeadingListEnd\s*\\vspace{-20pt})"
    match = re.search(projects_section_regex, resume_content, re.DOTALL)
    if not match:
        console.print("[bold red]Error: Could not find the Projects section.[/bold red]")
        return {"tailored_resume": resume_content}
    original_projects_section = match.group(1)
    
    feedback_context = ""
    if state.get("feedback") and state.get("downsides") and state.get("iteration_count", 0) > 0:
        feedback_context = f"""
            **Previous Feedback and Context:**
            - **Feedback from previous iteration:** {state.get("feedback", "")}
            - **Identified downsides to address:** {state.get("downsides", "")}
            - **Current iteration:** {state.get("iteration_count", 0)}

            **Here is entire resume for your reference:** 
            {state["tailored_resume"]}
            Please specifically address the feedback and downsides mentioned above while making improvements to the Projects section.
        """

    prompt = f"""You are an elite Resume Architect and LaTeX specialist. Your sole function is to transform a LaTeX resume into a highly targeted application for a specific job description.

        {feedback_context}

        Rewrite the bullet points in the LaTeX 'Projects' section below to be achievement-oriented, using the STAR (Situation, Task, Action, Result) or XYZ (Accomplished [X] as measured by [Y], by doing [Z]) framework. Follow these rules:
        - Quantify where ever or when ever possible. If the original resume lacks metrics, infer and add plausible, impressive metrics that align with the role's responsibilities.
        - Seamlessly and naturally integrate keywords and concepts from the job description throughout the narrative.
        - Use the `textbf{{}}` command to bold the most critical keywords that directly match the job description.
        - This is LaTeX code. Use ONLY `\\textbf{{keyword}}` to bold keywords. NEVER use **keyword** or __keyword__ markdown formatting.
        - You can add more details and points if needed to make the project more relevant to the job description.
        - You can add more points to the existing project if needed to make it more relevant to the job description but make sense and be cohesive.
        - You cannot change the project title, only the bullet points.

        Your output MUST be ONLY the updated LaTeX code for the 'Projects' section, wrapped in a single markdown block like this: ```latex [your code here] ```.

        **Job Description:**
        ---
        {state['job_description']}
        ---

        **Original LaTeX 'Projects' Section:**
        ---
        {original_projects_section}
        ---
    """
    
    response = llm.invoke(prompt)
    new_projects_section = clean_the_text(response.content)
    
    if new_projects_section:
        updated_resume = re.sub(projects_section_regex, lambda m: new_projects_section, resume_content, flags=re.DOTALL)
        return {"tailored_resume": updated_resume}
    else:
        console.print("[bold yellow]Warning: Failed to extract LaTeX from LLM response for Projects. Skipping update.[/bold yellow]")
        return {"tailored_resume": resume_content}

def judge_resume_quality(state):
    console.print(Panel("Judging Resume Quality...", title="Progress", border_style="blue"))
    llm = ChatOpenRouter(temperature=0.1, model_name="qwen/qwen3-235b-a22b:free")
    iteration_count = state.get("iteration_count", 0) + 1

    prompt = f"""You are an expert resume reviewer and critic. Your task is to evaluate how well the provided LaTeX resume is tailored to the given job description. Assign a score from 0 to 100, where 100% is perfectly tailored.
                Consider the following:
                - Use of keywords from the job description.
                - Quantification of achievements (STAR/XYZ method).
                - Judge the overall narrative and flow of the resume.
                - Overall impact and alignment with the job requirements.
                - Specify the downsides or drawbacks of the resume and specifically the resume section that can be better aligned with the job description.
                - Be Specific on which points can be improved in downsides.
                - Be genuine and honest in your evaluation.

                Provide your evaluation and score in a JSON object with three keys: "score" (float), "feedback" (string), and "downsides" (string).

                **Job Description:**
                ---
                {state['job_description']}
                ---

                **Tailored LaTeX Resume (excerpt):**
                ---
                {state['tailored_resume']}
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

def compile_resume(state):
    console.print(Panel("Compiling Resume...", title="Progress", border_style="blue"))
    resume_content = state["tailored_resume"]
    company_name = re.sub(r'[\\/*?:"<>|]', "", state["company_name"])
    position = re.sub(r'[\\/*?:"<>|]', "", state["position"])
    
    output_dir = "output"
    if not os.path.exists(output_dir):
        os.makedirs(output_dir)

    base_name = f"{company_name}_{position}_resume".replace(" ", "_")
    tex_path = os.path.join(output_dir, f"{base_name}.tex")
    pdf_path = os.path.join(output_dir, f"{base_name}.pdf")

    with open(tex_path, "w", encoding='utf-8') as f:
        f.write(resume_content)
    
    try:
        parsed_log = compile_latex(tex_path, output_dir)
        if parsed_log and parsed_log.errors == []:
            console.print(f"[green]Successfully compiled resume to: {pdf_path}[/green]")
        else:
            console.print("[bold red]Error: PDF compilation failed. Check the .log file in the output directory.[/bold red]")
            pdf_path = None
    except Exception as e:
        console.print(f"[bold red]An exception occurred during PDF compilation: {e}[/bold red]")
        pdf_path = None

    return {"pdf_path": pdf_path}

def decide_after_judging(state):
    if state["score"] < 90 and state["iteration_count"] < 3:
        console.print(Panel(f"Score {state['score']}/100 is below threshold. Re-editing technical skills. Iteration: {state['iteration_count']}", title="Decision", border_style="red"))
        return "edit_technical_skills"
    else:
        console.print(Panel(f"Score {state['score']}/100 is sufficient or max iterations reached. Proceeding to compile. Iteration: {state['iteration_count']}", title="Decision", border_style="green"))
        return "compile_resume"

workflow = StateGraph(AgentState)

workflow.add_node("get_job_description", get_job_description)
workflow.add_node("extract_info", extract_info)
workflow.add_node("edit_technical_skills", edit_technical_skills)
workflow.add_node("edit_experience", edit_experience)
workflow.add_node("edit_projects", edit_projects)
workflow.add_node("compile_resume", compile_resume)
workflow.add_node("judge_resume_quality", judge_resume_quality)

workflow.set_entry_point("get_job_description")
workflow.add_edge("get_job_description", "extract_info")
workflow.add_edge("extract_info", "edit_technical_skills")
workflow.add_edge("edit_technical_skills", "edit_experience")
workflow.add_edge("edit_experience", "edit_projects")
workflow.add_edge("edit_projects", "judge_resume_quality")

workflow.add_conditional_edges(
    "judge_resume_quality",
    decide_after_judging,
    {
        "edit_technical_skills": "edit_technical_skills",
        "compile_resume": "compile_resume",
    }
)

workflow.add_edge("compile_resume", END)

app = workflow.compile()

if __name__ == "__main__":
    inputs = {}
    try:
        mermaid_code = app.get_graph().draw_mermaid()
        draw_mermaid_png(mermaid_syntax=mermaid_code, output_file_path="graph.png")
    except Exception as e:
        print(f"Could not draw graph: {e}")
    app.invoke(inputs)

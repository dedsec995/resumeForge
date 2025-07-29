import json, os, re
from typing import TypedDict
from langchain_core.runnables.graph_mermaid import draw_mermaid_png
from langchain_groq import ChatGroq
from langgraph.graph import StateGraph, END
from langchain_google_genai import ChatGoogleGenerativeAI
from rich.console import Console
from rich.panel import Panel
from dotenv import load_dotenv
from latex2pdf import compile_latex
from utils import clean_the_text, extract_and_parse_json

load_dotenv()
GROQ_API_KEY = os.getenv("GROQ_API_KEY")
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")
console = Console()

class AgentState(TypedDict):
    resume: str
    job_description: str
    company_name: str
    position: str
    tailored_resume: str
    pdf_path: str
    score: float
    feedback: str
    downsides: str
    iteration_count: int

def get_resume_content(file_path="template/resume.tex"):
    with open(file_path, "r") as f:
        return f.read()

def ask_job_description(state):
    console.print(Panel("Please paste the job description here:", title="Job Description", border_style="green"))
    # job_description = console.input()
    job_description = """Faire is an online wholesale marketplace built on the belief that the future is local — independent retailers around the globe are doing more revenue than Walmart and Amazon combined, but individually, they are small compared to these massive entities. At Faire, we're using the power of tech, data, and machine learning to connect this thriving community of entrepreneurs across the globe. Picture your favorite boutique in town — we help them discover the best products from around the world to sell in their stores. With the right tools and insights, we believe that we can level the playing field so that small businesses everywhere can compete with these big box and e-commerce giants.

By supporting the growth of independent businesses, Faire is driving positive economic impact in local communities, globally. We’re looking for smart, resourceful and passionate people to join us as we power the shop local movement. If you believe in community, come join ours.

About this role:

Faire leverages the power of machine learning and data insights to revolutionize the wholesale industry, enabling local retailers to compete against giants like Amazon and big box stores. Our highly skilled team of data scientists and machine learning engineers specializes in developing algorithmic solutions related to discovery, ranking, search, recommendations, ads, logistics, underwriting, and more. Our ultimate goal is to empower local retail businesses with the tools they need to succeed.

As a member of the Discovery Personalization team, you’ll be responsible for: 

Personalization: Personalizing recommendations across surfaces of homepage, category page, brand page, and carousel recommendations, through retrieval embeddings models, near-real-time / streaming signals, Deep Learning or LLM-based ranking/recommendation models,  explore-exploit, and diversification
Our team already includes experienced Data Scientists and Machine Learning Engineers from Uber, Airbnb, Square, Meta, LinkedIn and Pinterest. We're a lean, talented team with high opportunity for direct product impact and ownership. 

You’re excited about this role because… 

You’ll be able to work on cutting-edge personalization and recommendation problems by combining a wide variety of data about our retailers, brands, and products
You want to use machine learning to help local retailers and independent brands succeed 
You want to be a foundational team member of a fast-growing company
You like to solve challenging problems related to a two-sided marketplace 
Qualifications 

1-3 years of relevant industry or research experience applying ML to real-world problems
Familiarity or experience with personalization systems or recommendation algorithms
Proficiency in Machine Learning / Deep Learning modeling and programming 
An excitement and willingness to learn new tools and techniques 
Strong communication skills and the ability to work with others in a closely collaborative team environment 
Great to Haves:

Master’s or PhD in Computer Science, Statistics, or related STEM fields 
Experience implementing state-of-the-art ML algorithms from an academic paper
Exposure to graph neural networks and/or language models
Salary Range

California & New York: the pay range for this role is $162,500 to $223,500 per year.

This role will also be eligible for equity and benefits. Actual base pay will be determined based on permissible factors such as transferable skills, work experience, market demands, and primary work location. The base pay range provided is subject to change and may be modified in the future.

Effective January 2025, Faire employees will be expected to go into the office 2 days per week on Tuesdays and Thursdays. Additionally, hybrid in-office roles will have the flexibility to work remotely up to 4 weeks per year. Specific Workplace and Information Technology positions may require onsite attendance 5 days per week as will be indicated in the job posting. 

Applications for this position will be accepted for a minimum of 30 days from the posting date.

Why you’ll love working at Faire

We are entrepreneurs: Faire is being built for entrepreneurs, by entrepreneurs. We believe entrepreneurship is a calling and our mission is to empower entrepreneurs to chase their dreams. Every member of our team is taking part in the founding process.
We are using technology and data to level the playing field: We are leveraging the power of product innovation and machine learning to connect brands and boutiques from all over the world, building a growing community of more than 350,000 small business owners.
We build products our customers love: Everything we do is ultimately in the service of helping our customers grow their business because our goal is to grow the pie - not steal a piece from it. Running a small business is hard work, but using Faire makes it easy.
We are curious and resourceful: Inquisitive by default, we explore every possibility, test every assumption, and develop creative solutions to the challenges at hand. We lead with curiosity and data in our decision making, and reason from a first principles mentality.
Faire was founded in 2017 by a team of early product and engineering leads from Square. We’re backed by some of the top investors in retail and tech including: Y Combinator, Lightspeed Venture Partners, Forerunner Ventures, Khosla Ventures, Sequoia Capital, Founders Fund, and DST Global. We have headquarters in San Francisco and Kitchener-Waterloo, and a global employee presence across offices in Toronto, London, and New York. To learn more about Faire and our customers, you can read more on our blog.

Faire provides equal employment opportunities (EEO) to all employees and applicants for employment without regard to race, color, religion, sex, national origin, age, disability, genetics, sexual orientation, gender identity or gender expression.

Faire is committed to providing access, equal opportunity and reasonable accommodation for individuals with disabilities in employment, its services, programs, and activities. Accommodations are available throughout the recruitment process and applicants with a disability may request to be accommodated throughout the recruitment process. We will work with all applicants to accommodate their individual accessibility needs.  To request reasonable accommodation, please fill out our Accommodation Request Form (https://bit.ly/faire-form)"""
    return {"job_description": job_description, "resume": get_resume_content()}

def extract_info(state):
    console.print(Panel("Extracting Company and Position...", title="Progress", border_style="blue"))
    llm = ChatGroq(temperature=0, model_name="llama-3.3-70b-versatile", api_key = GROQ_API_KEY)
    
    prompt = f"""From the following job description, extract the company name and the position title.
Return ONLY the JSON object, with two keys: "company" and "position". Do NOT include any other text or markdown.

Job Description:
{state['job_description']}
"""
    response = llm.invoke(prompt)    
    try:
        data = json.loads(response.content)
        company = data["company"]
        position = data["position"]
    except (json.JSONDecodeError, KeyError):
        console.print("[bold red]Error: Could not extract company and position in expected JSON format. Setting to 'Not Found'.[/bold red]")
        company = "Not Found"
        position = "Not Found"

    # Initialize tailored_resume with the original resume content
    return {"company_name": company, "position": position, "tailored_resume": state['resume']}

def edit_technical_skills(state):
    console.print(Panel("Editing Technical Skills...", title="Progress", border_style="blue"))
    llm = ChatGroq(temperature=0.7, model_name="llama-3.3-70b-versatile", api_key = GROQ_API_KEY)
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
- Add any crucial skills from the job description that are missing.
- Remove any skills that are irrelevant to the target job to reduce clutter and improve focus.
- Do NOT use the `textbf{{}}` command to bold any skills in this section.
- Make sure to not directly copy the job description skills to the resume.

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

Please specifically address the feedback and downsides mentioned above while making improvements to the Work Experience section.
"""

    prompt = f"""You are an elite Resume Architect and LaTeX specialist. Your sole function is to transform a generic LaTeX resume into a highly targeted application for a specific job description.

{feedback_context}

Rewrite the bullet points in the LaTeX 'Work Experience' section below to be achievement-oriented, using the STAR (Situation, Task, Action, Result) or XYZ (Accomplished [X] as measured by [Y], by doing [Z]) framework. Follow these rules:
- Quantify everything possible. If the original experience lacks metrics, infer and add plausible, impressive metrics that align with the role's responsibilities.
- Seamlessly and naturally integrate keywords and concepts from the job description throughout the narrative.
- Use the `textbf{{}}` command to bold the most critical keywords that directly match the job description. Do not using **i** or __i__ to bold the keywords.
- You can add more details and points if needed to make the experience more relevant to the job description but make sense and be cohesive.
- Don't make the experience too long or too short.
- Also don't make it sound like it has been written by a robot.

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
    llm = ChatGroq(temperature=0.7, model_name="llama-3.3-70b-versatile", api_key = GROQ_API_KEY)
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

Please specifically address the feedback and downsides mentioned above while making improvements to the Projects section.
"""

    prompt = f"""You are an elite Resume Architect and LaTeX specialist. Your sole function is to transform a generic LaTeX resume into a highly targeted application for a specific job description.

{feedback_context}

Rewrite the bullet points in the LaTeX 'Projects' section below to be achievement-oriented, using the STAR (Situation, Task, Action, Result) or XYZ (Accomplished [X] as measured by [Y], by doing [Z]) framework. Follow these rules:
- Quantify everything possible. If the original resume lacks metrics, infer and add plausible, impressive metrics that align with the role's responsibilities.
- Seamlessly and naturally integrate keywords and concepts from the job description throughout the narrative.
- You can add more details and points if needed to make the project more relevant to the job description.
- Use the `textbf{{}}` command to bold the most critical keywords that directly match the job description. Do not using **i** or __i__ to bold the keywords.
- You can add more points to the existing project if needed to make it more relevant to the job description but make sense and be cohesive.

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

def judge_resume_quality(state):
    console.print(Panel("Judging Resume Quality...", title="Progress", border_style="blue"))
    llm = ChatGoogleGenerativeAI(temperature=0.1, model="gemma-3-27b-it", google_api_key=GOOGLE_API_KEY)
    iteration_count = state.get("iteration_count", 0) + 1

    prompt = f"""You are an expert resume reviewer and critic. Your task is to evaluate how well the provided LaTeX resume is tailored to the given job description. Assign a score from 0 to 100, where 100% is perfectly tailored.
                Consider the following:
                - Relevance of skills and experience to the job description.
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

                **Tailored LaTeX Resume (excerpt):**
                ---
                {state['tailored_resume']}
                ---
            """

    response = llm.invoke(prompt)
    console.print(f"[bold green] Raw LLM Response: {response.content}[/bold green]")
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

def decide_after_judging(state):
    if state["score"] < 90 and state["iteration_count"] < 3:
        console.print(Panel(f"Score {state['score']}/100 is below threshold. Re-editing experience. Iteration: {state['iteration_count']}", title="Decision", border_style="red"))
        return "edit_experience"
    else:
        console.print(Panel(f"Score {state['score']}/100 is sufficient or max iterations reached. Proceeding to compile. Iteration: {state['iteration_count']}", title="Decision", border_style="green"))
        return "compile_resume"

workflow = StateGraph(AgentState)

workflow.add_node("ask_job_description", ask_job_description)
workflow.add_node("extract_info", extract_info)
workflow.add_node("edit_technical_skills", edit_technical_skills)
workflow.add_node("edit_experience", edit_experience)
workflow.add_node("edit_projects", edit_projects)
workflow.add_node("compile_resume", compile_resume)
workflow.add_node("judge_resume_quality", judge_resume_quality)

workflow.set_entry_point("ask_job_description")
workflow.add_edge("ask_job_description", "extract_info")
workflow.add_edge("extract_info", "edit_technical_skills")
workflow.add_edge("edit_technical_skills", "edit_experience")
workflow.add_edge("edit_experience", "edit_projects")
workflow.add_edge("edit_projects", "judge_resume_quality")

workflow.add_conditional_edges(
    "judge_resume_quality",
    decide_after_judging,
    {
        "edit_experience": "edit_experience",
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
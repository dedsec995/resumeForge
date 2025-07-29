import os
import re
from typing import TypedDict, Annotated, Sequence
from langchain_core.messages import BaseMessage, HumanMessage
from langchain_core.runnables.graph_mermaid import draw_mermaid_png
from langchain_groq import ChatGroq
from langgraph.graph import StateGraph, END
from rich.console import Console
from rich.panel import Panel
from dotenv import load_dotenv
import PyPDF2
import json
from latex2pdf import compile_latex
from utils import clean_the_text

load_dotenv()

console = Console()

class AgentState(TypedDict):
    resume: str
    job_description: str
    company_name: str
    position: str
    tailored_resume: str
    pdf_path: str
    page_count: int

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
    llm = ChatGroq(temperature=0, model_name="llama3-70b-8192")
    
    prompt = f"""From the following job description, extract the company name and the position title.
Return the output as a JSON object with two keys: "company" and "position".

Job Description:
{state['job_description']}
"""
    
    response = llm.invoke(prompt)
    
    try:
        match = re.search(r'```json\n(.*?)\n```', response.content, re.DOTALL)
        json_str = match.group(1) if match else response.content
        data = json.loads(json_str)
        company = data["company"]
        position = data["position"]
    except (json.JSONDecodeError, KeyError):
        parts = response.content.split(',')
        company = parts[0].strip()
        position = ", ".join(parts[1:]).strip() if len(parts) > 1 else "Not Found"

    # Initialize tailored_resume with the original resume content
    return {"company_name": company, "position": position, "tailored_resume": state['resume']}

def edit_technical_skills(state):
    console.print(Panel("Editing Technical Skills...", title="Progress", border_style="blue"))
    llm = ChatGroq(temperature=0.1, model_name="llama3-70b-8192")
    resume_content = state["tailored_resume"]

    skills_section_regex = r"(\\section{Technical Skills}.*?\\vspace{-13pt})"
    match = re.search(skills_section_regex, resume_content, re.DOTALL)
    if not match:
        console.print("[bold red]Error: Could not find the Technical Skills section.[/bold red]")
        return {"tailored_resume": resume_content}
    original_skills_section = match.group(1)

    # 2. Update the prompt to ask for a LaTeX markdown block
    prompt = f"""You are a LaTeX expert. Rewrite the 'Technical Skills' section below to align with the job description.
Incorporate relevant keywords from the job description.
Your output MUST be ONLY the updated LaTeX code, wrapped in a single markdown block like this: ```latex [your code here] ```.

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
    # 3. Use the utility function to extract the LaTeX code
    new_skills_section = clean_the_text(response.content)

    # 4. Handle potential parsing failure and replace the old section
    if new_skills_section:
        updated_resume = re.sub(skills_section_regex, lambda m: new_skills_section, resume_content, flags=re.DOTALL)
        return {"tailored_resume": updated_resume}
    else:
        console.print("[bold yellow]Warning: Failed to extract LaTeX from LLM response for Technical Skills. Skipping update.[/bold yellow]")
        return {"tailored_resume": resume_content}

def edit_experience(state):
    console.print(Panel("Editing Experience...", title="Progress", border_style="blue"))
    llm = ChatGroq(temperature=0.2, model_name="llama3-70b-8192")
    resume_content = state["tailored_resume"]

    experience_section_regex = r"(\\section{Work Experience}.*?\\vspace{-12pt})"
    match = re.search(experience_section_regex, resume_content, re.DOTALL)
    if not match:
        console.print("[bold red]Error: Could not find the Work Experience section.[/bold red]")
        return {"tailored_resume": resume_content}
    original_experience_section = match.group(1)
    
    # 2. Update the prompt
    prompt = f"""You are an expert resume writer. Rewrite the bullet points in the LaTeX 'Work Experience' section below to highlight skills from the job description. Use action verbs and quantify results.
Your output MUST be ONLY the updated LaTeX code, wrapped in a single markdown block like this: ```latex [your code here] ```.

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
    # 3. Use the utility function
    new_experience_section = clean_the_text(response.content)
    
    # 4. Handle failure and replace
    if new_experience_section:
        updated_resume = re.sub(experience_section_regex, lambda m: new_experience_section, resume_content, flags=re.DOTALL)
        return {"tailored_resume": updated_resume}
    else:
        console.print("[bold yellow]Warning: Failed to extract LaTeX from LLM response for Work Experience. Skipping update.[/bold yellow]")
        return {"tailored_resume": resume_content}

def edit_projects(state):
    console.print(Panel("Editing Projects...", title="Progress", border_style="blue"))
    llm = ChatGroq(temperature=0.2, model_name="llama3-70b-8192")
    resume_content = state["tailored_resume"]

    projects_section_regex = r"(\\section{Projects}.*?\\resumeSubHeadingListEnd\s*\\vspace{-20pt})"
    match = re.search(projects_section_regex, resume_content, re.DOTALL)
    if not match:
        console.print("[bold red]Error: Could not find the Projects section.[/bold red]")
        return {"tailored_resume": resume_content}
    original_projects_section = match.group(1)
    
    # 2. Update the prompt
    prompt = f"""You are an expert resume writer. Rewrite the LaTeX 'Projects' section below to highlight aspects relevant to the job description.
Your output MUST be ONLY the updated LaTeX code, wrapped in a single markdown block like this: ```latex [your code here] ```.

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
    # 3. Use the utility function
    new_projects_section = clean_the_text(response.content)
    
    # 4. Handle failure and replace
    if new_projects_section:
        updated_resume = re.sub(projects_section_regex, lambda m: new_projects_section, resume_content, flags=re.DOTALL)
        return {"tailored_resume": updated_resume}
    else:
        console.print("[bold yellow]Warning: Failed to extract LaTeX from LLM response for Projects. Skipping update.[/bold yellow]")
        return {"tailored_resume": resume_content}

def compile_resume(state):
    console.print(Panel("Compiling Resume...", title="Progress", border_style="blue"))
    resume_content = state["tailored_resume"]
    # Sanitize company and position names for file paths
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
        # The latex2pdf library can be finicky. Ensure it uses a temporary build directory.
        parsed_log = compile_latex(tex_path, output_dir)
        # Check if compilation was successful
        if parsed_log and parsed_log.errors == []:
            console.print(f"[green]Successfully compiled resume to: {pdf_path}[/green]")
        else:
             console.print("[bold red]Error: PDF compilation failed. Check the .log file in the output directory.[/bold red]")
             pdf_path = None # Indicate failure
    except Exception as e:
        console.print(f"[bold red]An exception occurred during PDF compilation: {e}[/bold red]")
        pdf_path = None

    return {"pdf_path": pdf_path}

def check_pdf_length(state):
    console.print(Panel("Checking PDF Length...", title="Progress", border_style="blue"))
    pdf_path = state["pdf_path"]
    
    if not pdf_path or not os.path.exists(pdf_path):
        console.print("[bold red]Skipping PDF length check because compilation failed.[/bold red]")
        # Decide how to handle failure. Maybe go to a new "fix_latex" node or end.
        # For now, we'll just end the process.
        return {"page_count": 99} # Use a high number to signal an issue or stop

    with open(pdf_path, "rb") as f:
        reader = PyPDF2.PdfReader(f)
        page_count = len(reader.pages)
    
    console.print(f"Resume is {page_count} page(s) long.")
    return {"page_count": page_count}

def shorten_resume(state):
    # This is a placeholder. A real implementation would be a complex LLM call
    # to summarize bullet points or reduce content, similar to the editing nodes.
    console.print(Panel("Resume is longer than one page. This is a placeholder for a shortening step.", title="Notice", border_style="yellow"))
    return {"tailored_resume": state["tailored_resume"]}

# --- Graph Definition (No Changes Needed Here) ---

workflow = StateGraph(AgentState)

workflow.add_node("ask_job_description", ask_job_description)
workflow.add_node("extract_info", extract_info)
workflow.add_node("edit_technical_skills", edit_technical_skills)
workflow.add_node("edit_experience", edit_experience)
workflow.add_node("edit_projects", edit_projects)
workflow.add_node("compile_resume", compile_resume)
workflow.add_node("check_pdf_length", check_pdf_length)
workflow.add_node("shorten_resume", shorten_resume)


workflow.set_entry_point("ask_job_description")
workflow.add_edge("ask_job_description", "extract_info")
workflow.add_edge("extract_info", "edit_technical_skills")
workflow.add_edge("edit_technical_skills", "edit_experience")
workflow.add_edge("edit_experience", "edit_projects")
workflow.add_edge("edit_projects", "compile_resume")

# Conditional edge to handle PDF length
def decide_what_to_do(state):
    if state["page_count"] > 1:
        # In a real scenario, you might loop back to a "shorten_and_recompile" flow.
        # Here we just go to the placeholder node and then compile again.
        return "shorten_resume"
    else:
        # If the resume is one page, we are done.
        return END

workflow.add_conditional_edges(
    "check_pdf_length",
    decide_what_to_do,
    {"shorten_resume": "shorten_resume", END: END}
)

# After shortening, re-compile the resume
workflow.add_edge("shorten_resume", "compile_resume")

app = workflow.compile()

if __name__ == "__main__":
    inputs = {}
    try:
        mermaid_code = app.get_graph().draw_mermaid()
        draw_mermaid_png(mermaid_syntax=mermaid_code, output_file_path="graph.png")
    except Exception as e:
        print(f"Could not draw graph: {e}")

    for event in app.stream(inputs):
        for k, v in event.items():
            if k != "__end__":
                console.print(f"----- {k} -----")
                console.print(v)
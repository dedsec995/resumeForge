

import os
import subprocess
import re
from typing import TypedDict
from langchain_groq import ChatGroq
from langgraph.graph import END, StateGraph
from dotenv import load_dotenv
from langchain_core.runnables.graph_mermaid import draw_mermaid_png

load_dotenv()

GROQ_API_KEY = os.getenv("GROQ_API_KEY")

# Define the state for our graph
class GraphState(TypedDict):
    job_description: str
    resume_tex: str
    tailored_resume_tex: str
    pdf_path: str
    log_path: str
    page_count: int
    shortening_attempts: int

# Define the nodes of the graph

def tailor_resume(state):
    """
    Tailors the resume to the job description using an LLM.
    """
    print("---TAILORING RESUME---")
    chat = ChatGroq(temperature=0.7, model_name="deepseek-r1-distill-llama-70b", api_key = GROQ_API_KEY)

    prompt = f"""
            You are an expert resume writer and LaTeX editor. Your task is to tailor a given LaTeX resume to a specific job description.
            Instructions:
            1.  Analyze the resume's Work Experience, Projects, and Technical Skills sections.
            2.  Compare these sections against the provided job description.
            3.  **Modify the resume content:**
                -   Rephrase bullet points in the work experience and projects to highlight skills and accomplishments relevant to the job description.
                -   Always Integrate keywords from the job description naturally.
                -   Under the 'Technical Skills' section, add any relevant skills from the job description that are missing.
                -   Remove any skills or technologies that are clearly irrelevant to the job description to save space.
                -   Bold the important keywords in the bullet points using \textbf{{}}
            4.  **Maintain LaTeX format:** You MUST output a valid LaTeX document. Do not change the structure or section commands of the resume. Only modify the content within the sections.
            5.  Return only the full, modified LaTeX code for the resume with in ```latex ```. Do not include any explanations or introductory text.
            6.  Again Don't forget. Do not include anything like explanation or any other text. Only give full LaTex code with the structure insdie ```latex ```as it is and only the content modified.
            Here is the resume:\n\n{state["resume_tex"]}\n\nHere is the job description:\n\n{state["job_description"]}
            Go through each points in the resume and decide if they need the change. Change it according to the above instructions.
             """

    response = chat.invoke(prompt)
    return {"tailored_resume_tex": response.content, "shortening_attempts": 0}

def compile_resume(state):
    """
    Compiles the LaTeX resume to a PDF.
    """
    print("---COMPILING RESUME---")
    file_path = "/home/dedsec995/resumeForge/output/resume_tailored.tex"
    with open(file_path, "w") as f:
        f.write(state["tailored_resume_tex"])
    
    process = subprocess.run(
        ["pdflatex", "-output-directory=output", file_path],
        capture_output=True,
        text=True,
    )
    log_path = "/home/dedsec995/resumeForge/output/resume_tailored.log"
    pdf_path = "/home/dedsec995/resumeForge/output/resume_tailored.pdf"
    
    if process.returncode != 0:
        print(f"---PDFLATEX FAILED---{process.stderr}")
    return {"pdf_path": pdf_path, "log_path": log_path}

def check_page_count(state):
    """
    Checks the number of pages in the PDF.
    """
    print("---CHECKING PAGE COUNT---")
    pdf_path = state["pdf_path"]
    if not os.path.exists(pdf_path):
        # This can happen if pdflatex failed
        return {"page_count": 999} # Return a high number to force shortening

    process = subprocess.run(
        ["pdfinfo", pdf_path],
        capture_output=True,
        text=True,
    )
    
    if process.returncode != 0:
        print(f"---PDFINFO FAILED---{process.stderr}")
        return {"page_count": 999} # Return a high number to force shortening

    for line in process.stdout.split("\n"):
        if line.startswith("Pages:"):
            page_count = int(line.split()[-1])
            print(f"Page count: {page_count}")
            return {"page_count": page_count}
    
    return {"page_count": 999} # Should not be reached

def shorten_resume(state):
    """
    Shortens the resume based on the log file and other heuristics.
    """
    print("---SHORTENING RESUME---")
    log_path = state["log_path"]
    with open(log_path, "r") as f:
        log_content = f.read()

    # Find overfull vbox warnings
    overfull_vbox_pattern = re.compile(r"Overfull \\vbox \((.*?)pt too high\) has occurred while \\output is active")
    matches = overfull_vbox_pattern.findall(log_content)

    if matches:
        print("---FOUND OVERFULL VBOX---")
        # For now, we'll just take the first match
        overflow_amount = float(matches[0])
        # In a real implementation, we would use an LLM to shorten the content
        # that is causing the overflow. For now, we'll just remove the last
        # \resumeItem from the tailored resume.
        tailored_resume_tex = state["tailored_resume_tex"]
        lines = tailored_resume_tex.split("\n")
        for i in range(len(lines) - 1, -1, -1):
            if "\\resumeItem" in lines[i]:
                lines.pop(i)
                break
        new_tailored_resume_tex = "\n".join(lines)
    else:
        print("---NO OVERFULL VBOX FOUND---")
        # If no overfull vbox, find the longest itemize section and shorten it
        tailored_resume_tex = state["tailored_resume_tex"]
        itemize_pattern = re.compile(r"\\begin{itemize}(.*?)\\end{itemize}", re.DOTALL)
        itemizes = itemize_pattern.findall(tailored_resume_tex)
        if itemizes:
            longest_itemize = max(itemizes, key=len)
            # In a real implementation, we would use an LLM to shorten this.
            # For now, we'll just remove the last \resumeItem.
            lines = longest_itemize.split("\n")
            for i in range(len(lines) - 1, -1, -1):
                if "\\resumeItem" in lines[i]:
                    lines.pop(i)
                    break
            new_itemize = "\n".join(lines)
            new_tailored_resume_tex = tailored_resume_tex.replace(longest_itemize, new_itemize)
        else:
            new_tailored_resume_tex = tailored_resume_tex

    return {"tailored_resume_tex": new_tailored_resume_tex, "shortening_attempts": state["shortening_attempts"] + 1}

def decide_to_finish(state):
    """
    Decides whether to finish or continue shortening.
    """
    if state["page_count"] == 1:
        return "finish"
    else:
        return "shorten"

# Create the graph
workflow = StateGraph(GraphState)

# Add the nodes
workflow.add_node("tailor_resume", tailor_resume)
workflow.add_node("compile_resume", compile_resume)
workflow.add_node("check_page_count", check_page_count)
workflow.add_node("shorten_resume", shorten_resume)

# Set the entrypoint
workflow.set_entry_point("tailor_resume")

# Add the edges
workflow.add_edge("tailor_resume", "compile_resume")
workflow.add_edge("compile_resume", "check_page_count")
workflow.add_conditional_edges(
    "check_page_count",
    decide_to_finish,
    {
        "finish": END,
        "shorten": "shorten_resume",
    },
)
workflow.add_edge("shorten_resume", "compile_resume")


# Compile the graph
app = workflow.compile()

if __name__ == "__main__":    
    with open("/home/dedsec995/resumeForge/template/resume.tex", "r") as f:
        resume_tex = f.read()    
        inputs = {"job_description": """
                At T-Mobile, we invest in YOU!  Our Total Rewards Package ensures that employees get the same big love we give our customers.  All team members receive a competitive base salary and compensation package - this is Total Rewards. Employees enjoy multiple wealth-building opportunities through our annual stock grant, employee stock purchase plan, 401(k), and access to free, year-round money coaches. That’s how we’re UNSTOPPABLE for our employees!

                The Machine Learning (ML) Engineer focuses on coding, deploying, and maintaining large-scale machine learning models throughout their lifecycle. By combining software engineering principles and data science/machine learning knowledge, the ML Engineer develops the data processes that make ML models generally available for use in products for end-users and customers. The ML engineer should understand machine learning algorithms, have experience in software engineering and various programming languages, including Python, SQL, and Apache Spark. By combining software engineering principles and ML/AI expertise, the engineer builds scalable infrastructure and workflows in modern MLOps environments such as Azure Databricks and GitLab CI/CD. They enable robust experimentation, versioning, and observability using tools like MLflow, LangGraph, and DSPy An understanding of the latest cloud technologies is imperative for the development and deployment of ML solutions as well. The ML Engineer’s core value lies in making AI solutions production-ready, performant, and maintainable using cloud-native services and open-source frameworks.
                Job Responsibilities:

                Build and maintain full machine learning lifecycles including experiment tracking, model governance, deployment, and monitoring using tools like MLflow, Databricks, DSPy, LangGraph, and Azure DevOps. 
                Assemble and transform large, complex datasets from Databricks, PostgreSQL, Apache-based sources, and other structured/unstructured systems, ensuring scalability and performance in production environments. 
                Collaborate with data science, ML, and platform teams to build graph-based or modular workflows (e.g., LangGraph), ML pipelines (e.g., in Databricks), and integration with DevOps and GitLab systems. 
                Ensure ML models are scalable, reproducible, and well-documented, leveraging MLOps tooling and open standards. 
                Also responsible for other Duties/Projects as assigned by business management as needed. 

                Education and Work Experience:

                Bachelor's Degree Computer Science, Statistics, Informatics, Information Systems, Machine Learning, or another quantitative field  (Required)
                Master's/Advanced Degree Computer Science, Statistics, Informatics, Information Systems, Machine Learning, or another quantitative field  (Preferred)
                Data Engineering, Data Science (Required)
                Experience with big data architecture and pipeline,  Spark (Required)
                Experience performing root cause analysis on internal and external data and processes to answer specific business questions and find opportunities for improvement Required
                Experience in programming languages such as Python/R, Java/Scala, and/ or Go Required(Required)
                Experience in Apache Spark and Databricks (Preferred)
                Experience in the telecom industry (Preferred)

                Knowledge, Skills and Abilities:

                Experience with Python-based ML tooling including DSPy, LangGraph, and MLflow. Strong SQL skills for interacting with PostgreSQL and data lakes. (Required)
                Proficiency with distributed computing (Apache Spark, MosaicML), orchestration (MLflow), and graph-based AI workflows (LangGraph).  (Required)

                Licenses and Certifications:

                Databricks Certified Machine Learning Professional. (Preferred)
                Azure Machine Learning Engineer Associate or related cloud/AI certification. (Preferred)
                #LI-Corporate

                #LI-Hybrid

                At least 18 years of age
                Legally authorized to work in the United States
                Base Pay Range: $97,700 - $176,200
                Corporate Bonus Target: 15%

                ""","resume_tex": resume_tex,}    
        app = workflow.compile()    
        mermaid_code = app.get_graph().draw_mermaid()
        draw_mermaid_png(mermaid_syntax=mermaid_code, output_file_path="graph.png")
        for output in app.stream(inputs):        
            for key, value in output.items():            
                print(f"Output from node '{key}':")            
                print("---")            
                print(value)        
                print("\n---\n")
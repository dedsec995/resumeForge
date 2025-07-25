import os, re
import subprocess
from typing import TypedDict
from langchain_groq import ChatGroq
from langchain_google_genai import ChatGoogleGenerativeAI
from langgraph.graph import END, StateGraph
from latex2pdf import compile_latex
from dotenv import load_dotenv
from langchain_core.runnables.graph_mermaid import draw_mermaid_png
from utils import clean_the_text

load_dotenv()

GROQ_API_KEY = os.getenv("GROQ_API_KEY")
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")

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
    chat = ChatGroq(temperature=0.7, model_name="llama-3.3-70b-versatile", api_key = GROQ_API_KEY)
    # chat = ChatGoogleGenerativeAI(temperature=0.6, model="gemma-3-27b-it", google_api_key=GOOGLE_API_KEY)

    prompt = f"""
            You are an elite Resume Architect and LaTeX specialist. Your sole function is to transform a generic LaTeX resume into a highly targeted application for a specific job description. You must follow all directives with precision.

            ## Primary Goal
            To meticulously rewrite and enhance the provided LaTeX resume, aligning its content—specifically the Work Experience, Projects, and Skills—with the requirements and keywords found in the provided Job Description.

            ## Key Inputs
            1.  **Original Resume**: A full LaTeX document.
            2.  **Job Description**: The target job posting.

            ## Core Directives

            1.  **Analyze and Extract**: Deeply analyze the provided Job Description to extract key qualifications, required skills (e.g., Python, AWS, SQL), desired technologies (e.g., Kubernetes, Terraform), and action-oriented keywords (e.g., "developed," "optimized," "led," "managed").

            2.  **Rewrite with Impact (STAR/XYZ)**: Rephrase all bullet points in the 'Work Experience' and 'Projects' sections to be achievement-oriented.
                * Employ the **STAR** (Situation, Task, Action, Result) or **XYZ** (Accomplished [X] as measured by [Y], by doing [Z]) framework.
                * **Quantify everything possible.** If the original resume lacks metrics, you must infer and add plausible, impressive metrics that align with the role's responsibilities.
                * **Example Transformation**: Change a weak point like "Developed a new feature" into a strong one like "**Engineered** a user-facing **analytics dashboard** using **React** and **D3.js**, resulting in a **15% increase** in user engagement."
                * **Aditional Points**: Do not add additional points or delete, make changes in the exisiting one if applicable.
                
            3.  **Keyword Integration**:
                * Seamlessly and naturally integrate the extracted keywords and concepts throughout the resume's narrative.
                * Use the `textbf{()}` command to bold the most critical keywords that directly match the job description only in 'Work Experience and 'Projects'.

            4.  **Skills Section Optimization**:
                * Add any crucial skills from the job description that are missing from the 'Technical Skills' section.
                * Group new skills logically within the existing subheadings (e.g., Languages, Frameworks, Tools). **Do not create new subheadings.**
                * Remove any skills that are irrelevant to the target job to reduce clutter and improve focus.

            5.  **Preserve Core Truths**: While enhancing content, you must preserve the fundamental facts of the original resume (company names, job titles, and core duties). Your task is to reframe and quantify existing experience, not to invent a new career history.

            ## Output Requirements

            1.  **Strict LaTeX Integrity**: The output MUST be a complete and valid LaTeX document. You must not alter the resume's structural commands (`documentclass`, `section`, `subsection`, etc.) or layout. All modifications must be confined to the content within items (e.g., `resumeItem`) and the 'Technical Skills' list.

            2.  **Code-Only Output**: Your entire response must be ONLY the final, modified LaTeX code. It must begin with `documentclass{...}` and end with `end{{document}}`.

            3.  **No Explanations**: Do not include any introductory text, concluding summaries, apologies, or explanations. The response will be used programmatically.

            4.  **Formatting**: Enclose the entire LaTeX output within a single ```latex ... ``` block.

            ---
            **Resume Input:**
            ```latex
            {state["resume_tex"]}```
            **Job Description Input:**
            {state["job_description"]}
        """

    response = chat.invoke(prompt)
    filtered_tailored_resume_tex = clean_the_text(response.content)
    return {"tailored_resume_tex": filtered_tailored_resume_tex, "shortening_attempts": 0}

def compile_resume(state):
    """
    Compiles the LaTeX resume to a PDF.
    """
    print("---COMPILING RESUME---")
    file_path = "/home/dedsec995/resumeForge/output/resume_tailored.tex"
    with open(file_path, "w") as f:
        f.write(state["tailored_resume_tex"])
    
    compile_latex(file_path, "/home/dedsec995/resumeForge/output")

    log_path = "/home/dedsec995/resumeForge/output/resume_tailored.log"
    pdf_path = "/home/dedsec995/resumeForge/output/resume_tailored.pdf"
    
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
    Shortens the resume using an LLM by looking at overfull boxes in the log.
    """
    print("---SHORTENING RESUME---")
    log_path = state["log_path"]
    with open(log_path, "r") as f:
        log_content = f.read()

    # Find overfull vbox warnings
    overfull_vbox_pattern = re.compile(r"Overfull \\vbox ((.*?)pt too high) has occurred while \\output is active")
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
    elif state["page_count"] == 999:
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
                

                We’re seeking a Machine Learning Engineer with a strong foundation in Python, experience in retrieval-augmented generation (RAG) pipelines, and expertise in context engineering. In this role, you’ll build intelligent retrieval systems and scalable generation workflows using structured (e.g., PostgreSQL) and unstructured data sources, integrating with vector databases to support high-performance natural language applications.


                You’ll join a collaborative, forward-thinking team driving innovation at the intersection of NLP, LLMs, and data infrastructure.


                ⸻


                Key Responsibilities

                • Design and implement retrieval-augmented generation (RAG) pipelines that integrate structured (e.g., PostgreSQL) and unstructured data sources.

                • Build and optimize vector search components using databases like FAISS, Pinecone, Weaviate, or pgvector (PostgreSQL extension).

                • Develop and refine context engineering strategies, including chunking, semantic compression, and relevance filtering to improve retrieval accuracy and generation output.

                • Work with prompt engineering and fine-tuning to improve LLM output relevance and consistency.

                • Collaborate with data scientists, ML engineers, and product teams to design end-to-end solutions.

                • Write maintainable, well-documented Python code and contribute to code reviews and architecture discussions.

                • Deploy, monitor, and continuously improve ML pipelines in production environments.


                ⸻


                Required Qualifications

                • 4–5 years of Python development experience focused on machine learning, NLP, or data engineering.

                • Hands-on experience with RAG pipelines, including prompt design, document indexing, and retrieval tuning.

                • Strong knowledge of PostgreSQL, including schema design, full-text search, and pgvector integration.

                • Familiarity with vector databases and libraries such as FAISS, Pinecone, Weaviate, or pgvector.

                • Practical experience with context engineering—optimizing context windows, dynamic retrieval, and relevance ranking.

                • Experience with tools like LangChain, Haystack, and Transformers (Hugging Face).

                • Solid understanding of REST APIs, Docker, and version control (Git).

                • Strong communication skills and ability to work across disciplines.


                ⸻


                Preferred Qualifications

                • Experience with cloud platforms (AWS, GCP, or Azure) and orchestration tools like Airflow or Prefect.

                • Exposure to data pipelines involving both structured and unstructured data.

                • Public Trust or other U.S. government clearance (or the ability to obtain it).

                • Experience in deploying and monitoring LLMs in production environments.

                • Familiarity with DevOps, observability, and CI/CD in ML workflows.

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
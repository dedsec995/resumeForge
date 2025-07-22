

import os
import subprocess
import re
from typing import TypedDict
from langchain_groq import ChatGroq
from langgraph.graph import END, StateGraph

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
    chat = ChatGroq(temperature=0, model_name="mixtral-8x7b-32768")

    prompt = f"""Tailor the following resume to the following job description.

Job Description:
{state['job_description']}

Resume:
{state['resume_tex']}

Return only the tailored resume in LaTeX format."""

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
        inputs = {"job_description": "Software Engineer at Google","resume_tex": resume_tex,}    
        app = workflow.compile()    
        for output in app.stream(inputs):        
            for key, value in output.items():            
                print(f"Output from node '{key}':")            
                print("---")            
                print(value)        
                print("\n---\n")
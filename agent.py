

import os
import subprocess
import re
from typing import TypedDict
from langchain_groq import ChatGroq
from langgraph.graph import END, StateGraph
from dotenv import load_dotenv
from langchain_core.runnables.graph_mermaid import draw_mermaid_png
from utils import clean_the_text

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
            3.  Change the bullet points to better align to the job description. Make up the experience if needed, I'll handle it later. Only change if needed. Try to make it concise and elaborate
            4. Try to follow STAR, XYZ or CAR methodology
            5.  **Modify the resume content rules:**
                -   Rephrase bullet points in the work experience and projects to highlight skills and accomplishments relevant to the job description.
                -   Always Integrate keywords from the job description naturally.
                -   Under the 'Technical Skills' section, add any relevant skills from the job description that are missing.
                -   Remove any skills or technologies that are irrelevant to the job description and make space for relevant onces.
                -   Bold the important keywords in the bullet points using \textbf{{}}  
            6.  **Maintain LaTeX format:** You MUST output a valid LaTeX document. Do not change the structure or section commands of the resume. Only modify the content within the sections i.e. \resumeItem.
            7.  Return only the full, modified LaTeX code for the resume with in ```latex ```. Do not include any explanations or introductory text.
            8.  Again Don't forget. Do not include anything like explanation or any other text. Only give full LaTex code with the structure insdie ```latex ```as it is and only the content modified.
            Here is the resume:\n\n{state["resume_tex"]}\n\nHere is the job description:\n\n{state["job_description"]}
            Go through each points in the resume and decide if they need the change. Change it according to the above instructions.
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
                The Software Engineer will work as part of a team within the Advanced Computing & Analytics Laboratory (ACAL) under the Enterprise Data and Analytics Division (EDA) and the School of Applied Computational Sciences (SACS). An integral component of the EDA and the SACS, the ACAL is a recognized center of excellence on the Meharry Medical College campus which fosters a culture of innovation, learning, engagement, and personal growth in support of EDA business intelligence and SACS research and development mission statements which both seek to develop and deploy impactful and socially-responsible scientific knowledge and practical technologies that empower society to improve the quality of life. The Software Engineer will be critical in achieving this vision and strategy for solving complex business problems with cutting-edge solutions driven by the latest advancements in artificial intelligence and machine learning
                Position Summary: 

                The Software Engineer will work as part of a team within the Advanced Computing & Analytics Laboratory (ACAL) under the Enterprise Data and Analytics Division (EDA) and the School of Applied Computational Sciences (SACS). An integral component of the EDA and the SACS, the ACAL is a recognized center of excellence on the Meharry Medical College campus which fosters a culture of innovation, learning, engagement, and personal growth in support of EDA business intelligence and SACS research and development mission statements which both seek to develop and deploy impactful and socially-responsible scientific knowledge and practical technologies that empower society to improve the quality of life. The Software Engineer will be critical in achieving this vision and strategy for solving complex business problems with cutting-edge solutions driven by the latest advancements in artificial intelligence and machine learning.

                Essential Functions:

                Distill complex business problems into clear data science and machine learning projects.
                Provide software engineering expertise and recommend data science approaches to meet various stakeholder needs.
                Analyze complex “business” problems and execute use cases from existing data assets.
                Work closely with product managers to identify and answer important product questions that help improve outcomes.
                Interpret problems and provide solutions using appropriate data modeling techniques.
                Develop prototypes for new data product ideas
                Design large scale models using Logistic Regression, Decision Trees, Conjoint Analysis, Spatial models, Time-series models, and Machine Learning algorithms
                Communicate findings to product managers and development groups
                Drive the collection of new data and the refinement of existing data
                Analyze and interpret the results of product experiments
                Regularly invent new and novel approaches to problems; take initiative and break down barriers to solve problems; be recognized within team as the source of solutions
                Manipulate and analyze complex, high-volume, high-dimensionality data from multiple sources
                Bring a strong passion for empirical research and for answering hard questions with data
                Communicate complex quantitative analysis in a clear, precise, and actionable manner
                Provide software engineering training to various EDA and SACS clients.
                Performs other related duties as assigned.
                                                                                                                                                    

                Knowledge, Skills and Abilities:

                Solid programming fundamentals with preferred emphasis on Python, R, Postgres and/or SQL-based technologies, and SAS, as well as other useful mainstream programming languages for data science including Java, Scala, Julia, MATLAB, JavaScript, TensorFlow, Go, Spark.
                Experience leading end-to-end data science project implementation.
                Experience working with cross-functional project teams and managing communications including in-person or virtual meetings is preferred.
                Motivation to learn, lead, and contribute as a team player on a variety of data and software engineering projects.
                Exceptional technical writing skills.
                Ability to communicate ideas and execution plans clearly to both technical and non-technical teams.
                Analytical and problem-solving skills.
                Experience with machine learning and AI.
                Familiarity with data management tools.
                Ability to work independently and with team members from different backgrounds.
                Excellent attention to detail.
                Proficiency in statistics, data analysis, and research methods.
                Ability to use independent judgment and to manage and impart confidential information.
                Ability to develop and deliver presentations.
                Ability to plan, assess, and evaluate programs.
                Education and Experience:

                Master’s Degree in Software Engineering, Computer Science, Data Science, or a related field.
                Minimum of two (2) years’ demonstrated experience applying software engineering methodologies to real-world data problems.
                Environmental Conditions and Physical Demands

                Work is normally performed in a typical interior/office work environment.
                No or very limited physical effort required.
                No or very limited exposure to physical risk.
                May require extended work hours and/or travel.

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
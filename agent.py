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
    llm = ChatOpenRouter(temperature=0.1, model_name="qwen/qwen3-235b-a22b:free")
    # llm = ChatOpenAI(temperature=0.1, model="gpt-4", api_key=OPENAI_API_KEY)
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
    llm = ChatGoogleGenerativeAI(temperature=0, model="gemini-1.5-flash", google_api_key=GOOGLE_API_KEY)
    
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
    if state["score"] < 90 and state["iteration_count"] < 3:
        console.print(Panel(f"Score {state['score']}/100 is below threshold. Re-editing technical skills. Iteration: {state['iteration_count']}", title="Decision", border_style="red"))
        return "edit_technical_skills"
    else:
        console.print(Panel(f"Score {state['score']}/100 is sufficient or max iterations reached. Proceeding to finalize. Iteration: {state['iteration_count']}", title="Decision", border_style="green"))
        return "keywords_editor"

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

if __name__ == "__main__":
    sample_json_data = """{
    "sessionId": "d82b7e61-0cc2-489f-842d-eba9a0f6df71",
    "jobDescription": "Machine Learning Engineer (Hybrid)\\nat Weedmaps (View all jobs)\\nAustin, TX\\nMachine Learning Engineer (Hybrid - Onsite 2 days a week)\\n\\nOverview:\\n\\nThe Machine Learning Engineer at Weedmaps will be a key technical contributor within our Data organization. In this role you will build and deploy sophisticated AI and machine learning systems that power our marketplace and e-commerce platform. The ideal candidate is a hands-on ML practitioner with strong software engineering fundamentals who can build end-to-end systems that deliver measurable business impact. You will collaborate extensively with cross-functional teams, including Product to understand user needs and translate them into ML solutions; Engineering to integrate ML systems into our broader ecosystem; Data and Analytics to leverage insights and coordinate on data strategies; as well as stakeholders across the business to ensure ML initiatives are aligned with company objectives.\\n\\nAs part of our Data organization, you will develop and deploy machine learning solutions that address unique challenges in our marketplace, including product matching, personalized recommendations that comply with complex regulatory requirements, and data-driven optimizations across our marketplace. The explosive growth of the cannabis industry requires increasingly sophisticated ML solutions that can scale with our business.\\n\\nThe impact you'll make:\\n\\nDevelop production-ready Python-based ML models with a focus on advanced NLP, similarity metrics, and product matching and recommendations\\nCreate and refine machine learning pipelines that can handle the unique challenges of our product data, including inconsistent naming and categorization\\nDevelop comprehensive evaluation frameworks including evals and metrics to benchmark ML model performance in real-world scenarios\\nImplement automated evaluation pipelines to continuously monitor model performance in production\\nBuild and maintain scalable ML infrastructure using a mix of managed services (eg AWS SageMaker) and custom services (such as function as a service apps on Kubernetes)\\nImplement best practices for model serving, versioning, and monitoring in production environments\\nOptimize model deployment pipelines for reliability, performance, and cost-efficiency\\nDesign, implement, and analyze A/B (or MAB) tests to evaluate ML system performance in production systems (e.g. with Optimizely or similar tools), ensuring that ML systems achieve business objectives\\nDesign and build API-based microservices that integrate ML functionality into our broader engineering ecosystem, ideally creating reusable ML components that can be leveraged across multiple product lines\\nWhat you've accomplished:\\n\\nBachelor's degree in Computer Science, Data Science, or related quantitative field\\n2+ years of experience building and deploying machine learning models in production environments\\n4+ Years of relevant experience in Machine Learning, Data Science, Data/Software Engineering.\\nStrong programming skills in Python and experience with modern LLM endpoints\\nExperience with MLOps practices for model monitoring, maintenance, and lifecycle management\\nDemonstrated expertise in machine learning algorithms and frameworks (e.g. TensorFlow, PyTorch, or scikit-learn) as well as modern LLM systems (Anthropic, OpenAI) with a proven track record of deploying models to production\\nProficiency in software engineering best practices, including version control, code review, testing, and documentation\\nStrong understanding of data engineering principles and experience with data preprocessing, feature engineering, and data quality assurance\\nHistory of effective collaboration with cross-functional teams to deliver ML solutions that drive measurable business results\\nExperience communicating complex ML concepts to both technical and non-technical stakeholders\\nExperience with cloud computing platforms, preferably AWS (particularly SageMaker and Bedrock)\\nBonus points:\\n\\nExperience using AI endpoints such as Claude or ChatGPT for embeddings and more advanced AI pipeline use cases such as hybrid ranking systems leveraging RAG with AI-based re-rankers that optimize specific metrics (e.g. precision)\\nSuccessfully built and deployed ML systems that solved real business problems in e-commerce or marketplace environments\\nE-commerce or marketplace business experience preferred\\nRegulated industry experience - nice to have\\nThe base pay range for this position is $181,875.00 - $200,645.00 per year\\n\\n2025 Benefits for Full Time, Regular Employees:\\n\\nPhysical Health benefits: Medical, Dental & Vision:\\nEmployee - employer paid premium 100%\\nCompany contribution to a HSA when electing the High Deductible Health Plan\\nFor plans that offer coverage to your dependents, you pay a small contribution\\nMental Health benefits:\\nFree access to CALM app for employees and dependents\\nEmployee Training\\nMental Health seminars and Q&A sessions\\nBasic Life & AD&D - employer paid 1x salary up to $250,000\\n401(k) Retirement Plan (with employer match contribution)\\nGenerous PTO, Paid Sick Leave, and Company Holidays\\nSupplemental, voluntary benefits\\nStudent Loan Repayment/529 Education Savings - including a company contribution\\nFSA (Medical, Dependent, Transit and Parking)\\nVoluntary Life and AD&D Insurance\\nCritical Illness Insurance\\nAccident Insurance\\nShort- and Long-term Disability Insurance\\nPet Insurance\\nFamily planning/fertility\\nIdentity theft protection\\nLegal access to a network of attorneys\\nPaid parental leave\\nWhy Work at Weedmaps?\\n\\nYou get to work at the leading technology company in the cannabis industry\\nYou get to play a meaningful role in helping to advance cannabis causes, including helping improve the lives of patients who rely on the benefits of cannabis\\nYou get an opportunity to shape the future of the cannabis industry\\nYou get to work on challenging issues in a collaborative environment that encourages you to do your best \\nYou get to work in a casual and fun environment; no fancy clothes required, but you are free to dress to the nines!\\nGenerous PTO and company holidays\\nNumerous opportunities and tools to learn and grow your professional skills\\nEndless opportunities to network and connect with other Weedmappers through speaker series, Employee Resource Groups, happy hours, team celebrations, game nights, and much more!",
    "linkedin": "linkedin.com/in/amit-luhar/",
    "github": "github.com/dedsec995",
    "website": "https://amitluhar.com/",
    "certifications": [
        {
        "text": "Natural Language Processing - DeepLearning.AI",
        "url": "https://www.coursera.org/account/accomplishments/certificate/PXWY38Y7VJZB"
        },
        {
        "text": "TensorFlow Developer Specialization",
        "url": "https://www.coursera.org/account/accomplishments/specialization/certificate/YW8U4922JT6N"
        }
    ],
    "technicalSkillsCategories": [
        {
        "categoryName": "Languages",
        "skills": "Python, C++, SQL, Bash, JavaScript/TypeScript"
        },
        {
        "categoryName": "ML / AI",
        "skills": "PyTorch, TensorFlow, Keras, Langchain, Transformers, Scikit-learn, Pandas, NumPy, OpenCV"
        },
        {
        "categoryName": "Backend & Cloud",
        "skills": "Flask, Node, FastApi, Django, REST APIs, Docker, Kubernetes, MLFlow, AWS, Git"
        },
        {
        "categoryName": "Data & Pipelines",
        "skills": "PySpark, Apache Airflow, Dask, Kafka, JSON, CSV"
        }
    ],
    "workExperience": [
        {
        "jobTitle": "Machine Learning Assistant",
        "company": "Binghamton University",
        "location": "Binghamton, NY",
        "duration": "January 2025 -- Present",
        "bulletPoints": "Architected 'Data Insight', a **multi-agent AI platform** that accelerates the product development lifecycle by automating **EDA** and feature engineering. System achieved over **90% accuracy** in feature identification, enabling data scientists to rapidly uncover data\\nCollaborated in a team of six researchers to architect an automated **AutoML pipeline**, orchestrated agentic workflows for training diverse ML models and leveraged **MLflow** for experiment tracking, resulting 70% reduction in end-to-end analysis"
        },
        {
        "jobTitle": "SafeRide Engineer",
        "company": "Binghamton University",
        "location": "Binghamton, NY",
        "duration": "August 2024 -- December 2024",
        "bulletPoints": "Developed and deployed a scalable, **LLM-powered chatbot** using Python and **Langchain**, integrating with a existing platform to automate user inquiries\\nConstructed Python scripts and tooling to execute **dynamic SQL queries** against database, significantly improving the data processing efficiency of the AI agent and removing human interaction\\nImplemented comprehensive **LLM observability using Langfuse** for detailed tracing and cost monitoring, ensuring the reliability and quality of the production service"
        },
        {
        "jobTitle": "Artificial Intelligence Engineer",
        "company": "Flow.ai",
        "location": "Austin, Texas",
        "duration": "January 2024 -- May 2024",
        "bulletPoints": "Architected end-to-end NLP solutions for Django SaaS platform utilizing **Transformer**, **Bedrock**, **SageMaker**, and **ECS**\\nIncreased **Mixtral 8x7B** accuracy in sales-related query processing by **31%** through **document chunk mechanisms** within **RAG**\\nReduced **LLM inference latency** to an average of **2.78s** using **vLLM** and **PagedAttention** for optimized **KV cache** handling\\nImproved **response times** by **40%** through **Redis caching** of frequent queries, reducing redundant **LLM calls**"
        },
        {
        "jobTitle": "Software Engineer",
        "company": "Tata Elxsi",
        "location": "Pune, India",
        "duration": "August 2021 -- June 2022",
        "bulletPoints": "Enhanced a **large-scale data processing system** by optimizing a **C++ framework** for **real-time telemetry**, reducing data transmission latency by **21%** (**55.3 ms**) to improve downstream data availability for **millions of vehicles**\\nDeveloped a **data pipeline** managing diverse CAN protocols, implementing **thread-safe concurrent data transfer** of **3 million vehicles** data via **Spark**, pipelined through **Kafka**, and scaled with **Kubernetes** to process **100,000+ events/second**\\nUtilized **Apache Airflow** to monitor **data pipeline performance**, troubleshoot issues, and ensure **data quality** and **reliability**\\nPartnered with the testing team to design a **car emulator**, obviating **testing costs** by eliminating the necessity of physical vehicles for testing"
        },
        {
        "jobTitle": "Software Engineer",
        "company": "Shree Hari Enterprise",
        "location": "Mumbai, India",
        "duration": "January 2020  -- June 2021",
        "bulletPoints": "Designed and deployed a **dynamic route optimization engine** (**VRP-based**) utilizing **real-time Mumbai traffic data**, reduced **vehicle idle time by 40 minutes per day** and optimized delivery sequences for **400+ daily orders**\\nDeveloped a **hyper-local demand forecasting model** using **XGBoost** for **FMCG products**, leveraging **Tally ERP data** and improving **forecast accuracy by 13%** and **preventing stockouts**\\nImplemented an **MLOps pipeline** using **MLFlow** for **continuous integration and deployment** of the forecasting model, automating model retraining cycles and **reducing deployment time by 50%**\\nCollaborated with stakeholders to decrease excess inventory holding **costs by 7%** while maintaining a **99% service level**"
        }
    ],
    "projects": [
        {
        "projectName": "Foodie",
        "techStack": "Python, LangGraph, OpenAI",
        "projectLink": "https://github.com/dedsec995/Foodiee/",
        "linkText": "Source Code",
        "bulletPoints": "Orchestrated an **agentic workflow using LangGraph** to build an intelligent cooking assistant that automates recipe discovery, scales ingredients for different serving sizes, and manages user inventory"
        },
        {
        "projectName": "Navi Drive",
        "techStack": "C++, Tensorflow, Android",
        "projectLink": "http://ijrar.org/viewfull.php?&p_id=IJRAR21B1839",
        "linkText": "Paper",
        "bulletPoints": "Crafted a real-time solution, fine-tuning **SSD mobilenet v2 keras** for vehicles, traffic signs, traffic lights for object detection\\nOptimized and deployed tensorflow lite on edge device, reducing inference to **100ms & 38 mAP** accuracy by **8 bit quantization**"
        }
    ],
    "education": [
        {
        "university": "State University of New York at Binghamton",
        "degree": "Master of Science in Computer Science",
        "date": "December 2024",
        "track": "Artificial Intelligence Trakc",
        "coursework": "Operating Systems, Machine Learning, Computer Architecture, Algorithms and Data Structures"
        }
    ],
    "atsKeywords": "",
    "metadata": {
        "lastUpdated": "2025-08-02T19:59:10.839836",
        "version": "1.0",
        "created": ""
    },
    "technicalSkills": {},
    "invisibleKeywords": "AWS, EC2, AMAZON WEB SERVICE, production systems, Implement best practices, Kubernetes, NLP, machine learning algorithms, engineering principles"
    }
    """

    inputs = {"resume_data": json.loads(sample_json_data)}
    try:
        mermaid_code = app.get_graph().draw_mermaid()
        draw_mermaid_png(mermaid_syntax=mermaid_code, output_file_path="graph.png")
    except Exception as e:
        print(f"Could not draw graph: {e}")

    # The invoke method will now run the graph and print the final JSON
    app.invoke(inputs)

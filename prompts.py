"""
Prompts for the Resume Forge agent workflow
"""

# Extract company, position, and location from job description
EXTRACT_INFO_PROMPT = """From the following job description, extract the company name, the position title, and the job location.
Format the location as "City, ST" (e.g., "Los Angeles, CA", "New York, NY").
Return ONLY the JSON object, with three keys: "company", "position", and "location". Do NOT include any other text or markdown.
If the location is not specified, default to "Open to Relocation".

Job Description:
{job_description}
"""

# Edit technical skills section
EDIT_TECHNICAL_SKILLS_PROMPT = """You are an elite Resume Architect. Your sole function is to transform a generic JSON resume into a highly targeted application for a specific job description.

{feedback_context}

Rewrite the 'technicalSkillsCategories' section of the resume to align with the job description. Follow these rules:
- You can use the skills from the job description as a reference to add more skills to the resume.
- Add any crucial skills from the job description that are missing.
- Remove any skills that are irrelevant to the target job to reduce clutter and improve focus.

Your output MUST be ONLY the updated JSON for the 'technicalSkillsCategories' section, wrapped in a single block like this: ``json ... ```

**Job Description:**
---
{job_description}
---

**Original 'technicalSkillsCategories' JSON Section:**
---
{original_skills_section}
---
"""

# Edit work experience section
EDIT_EXPERIENCE_PROMPT = """You are an elite Resume Architect. Your sole function is to transform a JSON resume into a highly targeted application for a specific job description.

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
{job_description}
---

**Original 'workExperience' JSON Section:**
---
{original_experience_section}
---
"""

# Edit projects section
EDIT_PROJECTS_PROMPT = """You are an elite Resume Architect. Your sole function is to transform a JSON resume into a highly targeted application for a specific job description.

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
{job_description}
---

**Original 'projects' JSON Section:**
---
{original_projects_section}
---
"""

# Judge resume quality
JUDGE_QUALITY_PROMPT = """You are an expert resume reviewer and critic. Your task is to evaluate how well the provided JSON resume is tailored to the given job description. Assign a score from 0 to 100, where 100 is perfectly tailored.
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
{job_description}
---

**Tailored JSON Resume:**
---
{tailored_resume_data}
---
"""

# Extract keywords for ATS
KEYWORDS_EXTRACTION_PROMPT = """
Based on the job description and the resume, identify the 15 most important keywords that align the candidate's skills and experience with the job requirements.
The keywords should be single words or short phrases (e.g., "Python", "Data Analysis", "Machine Learning").
Return ONLY a JSON object with a single key "keywords" which is a list of these 15 keywords. Do not include any other text, labels, or markdown.

**Job Description:**
---
{job_description}
---

**Resume JSON:**
---
{resume_data}
---
"""

# Feedback context template for iterations
FEEDBACK_CONTEXT_TEMPLATE = """
**Previous Feedback and Context:**
- **Feedback from previous iteration:** {feedback}
- **Identified downsides to address:** {downsides}
- **Current iteration:** {iteration_count}

Please specifically address the feedback and downsides mentioned above while making improvements to the {section_name} section.
"""

# Feedback context template for experience section with full resume
FEEDBACK_CONTEXT_EXPERIENCE_TEMPLATE = """
**Previous Feedback and Context:**
- **Feedback from previous iteration:** {feedback}
- **Identified downsides to address:** {downsides}
- **Current iteration:** {iteration_count}

**Here is entire resume for your reference:**
{full_resume_data}

Please specifically address the feedback and downsides mentioned above while making improvements to the Work Experience section.
"""

# Feedback context template for projects section with full resume
FEEDBACK_CONTEXT_PROJECTS_TEMPLATE = """
**Previous Feedback and Context:**
- **Feedback from previous iteration:** {feedback}
- **Identified downsides to address:** {downsides}
- **Current iteration:** {iteration_count}

**Here is entire resume for your reference:**
{full_resume_data}

Please specifically address the feedback and downsides mentioned above while making improvements to the Projects section.
"""

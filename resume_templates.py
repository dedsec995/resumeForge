"""
Resume template functions for generating LaTeX content from JSON data
"""
import re

def generate_header_template(personal_info):
    """Generate the header section with personal information"""
    name = personal_info.get("name", "John Doe")
    phone = personal_info.get("phone", "(000) 000-0000")
    email = personal_info.get("email", "email@example.com")
    linkedin = personal_info.get("linkedin", "linkedin.com/in/profile")
    github = personal_info.get("github", "github.com/profile")
    website = personal_info.get("website", "")
    
    # Clean LinkedIn and GitHub handles
    linkedin_handle = linkedin.replace("linkedin.com/in/", "").replace("in/", "").rstrip("/")
    github_handle = github.replace("github.com/", "").replace("github/", "").rstrip("/")
    
    # Generate website section if provided
    website_section = ""
    if website and website.strip():
        # Clean website URL (remove http/https for display)
        website_display = website.replace("https://", "").replace("http://", "").rstrip("/")
        website_section = f"{{\\faBriefcase\\ \\href{{{website}}}{{{website_display}}}}} ~"
    
    header = f"""\\begin{{center}}
    {{\\huge \\scshape {name}}} \\\\[2mm]
    \\small \\raisebox{{-0.1\\height}}
    \\faPhone\\ {phone} ~ 
    {{\\faEnvelope\\  \\href{{mailto:{email}}}{{{email}}}}} ~ 
    {{\\faLinkedin\\ \\href{{https://www.linkedin.com/in/{linkedin_handle}/}}{{in/{linkedin_handle}}}}}  ~
    {{\\faGithub\\ \\href{{https://github.com/{github_handle}}}{{github/{github_handle}}}}} ~
    {website_section}
    {{\\faGlobe\\ {{Open to Relocation}}}}
    \\vspace{{-5pt}}
\\end{{center}}"""
    
    return header

def generate_technical_skills_template(skills_data, certifications_data=None, ordered_categories=None):
    """Generate the technical skills section including certifications"""
    if not skills_data and not ordered_categories:
        return ""
    
    skills_content = """%-----------TECHNICAL SKILLS-----------
\\section{Technical Skills}
  \\vspace{-1pt}
  \\begin{itemize}[leftmargin=0.0in, label={}]
    \\small{\\item{   
"""
    
    # Use ordered categories if available, otherwise fall back to dictionary order
    if ordered_categories:
        # Process categories in the order they appear in the frontend
        for category in ordered_categories:
            category_name = category.get("categoryName", "").strip()
            skills_text = category.get("skills", "").strip()
            
            # Skip empty categories or certifications (handled separately)
            if not category_name or category_name.lower() == "certifications":
                continue
                
            if skills_text:
                # Split comma-separated skills into list
                skills_list = [skill.strip() for skill in skills_text.split(",") if skill.strip()]
                if skills_list:
                    # Regular skills categories (not certifications)
                    safe_category = category_name.replace('%', '\\%').replace('&', '\\&')
                    skills_escaped = [skill.replace('%', '\\%').replace('&', '\\&') for skill in skills_list]
                    skills_text_formatted = ", ".join(skills_escaped)
                    skills_content += f"    \\textbf{{{safe_category}}}{{: {skills_text_formatted}}} \\\\ [1mm]\n"
    else:
        # Fallback to dictionary order (for backward compatibility)
        for category, skills in skills_data.items():
            if isinstance(skills, list) and skills and category.lower() != "certifications":
                # Regular skills categories (not certifications)
                safe_category = category.replace('%', '\\%').replace('&', '\\&')
                skills_escaped = [skill.replace('%', '\\%').replace('&', '\\&') for skill in skills]
                skills_text = ", ".join(skills_escaped)
                skills_content += f"    \\textbf{{{safe_category}}}{{: {skills_text}}} \\\\ [1mm]\n"
    
    # Then, add certifications at the very end if they exist
    if certifications_data and len(certifications_data) > 0:
        cert_parts = []
        for cert in certifications_data:
            cert_text = cert.get("text", "")
            cert_url = cert.get("url", "")
            
            # Skip empty certifications
            if not cert_text.strip():
                continue
                
            # Escape special characters
            safe_text = cert_text.replace('%', '\\%').replace('&', '\\&')
            
            if cert_url and cert_url.strip():
                cert_parts.append(f"\\href{{{cert_url}}}{{{safe_text}}}")
            else:
                cert_parts.append(safe_text)
        
        # Only add the certifications section if we have actual content
        if cert_parts:
            certs_text = ", ".join(cert_parts)
            skills_content += f"    \\textbf{{Certifications}}{{: {certs_text} }} \\\\ [1mm]\n"
    
    skills_content += """    }}
  \\end{itemize}
\\vspace{-14pt}
% -----------TECHNICAL SKILLS END-----------"""
    
    return skills_content

def generate_education_template(education_data):
    """Generate the education section"""
    if not education_data:
        return ""
    
    education_content = """%-----------EDUCATION-----------
\\section{Education}"""
    
    for edu in education_data:
        university = edu.get("university", "")
        date = edu.get("date", "")
        degree = edu.get("degree", "")
        track = edu.get("track", "")
        coursework = edu.get("coursework", [])
        
        # Combine degree and track
        full_degree = f"{degree} | {track}" if track else degree
        
        education_content += f"""
  \\resumeSubHeadingListStart
    \\resumeSubheading
    {{{university}}}{{{date}}}
    {{{full_degree}}}{{}}
  \\resumeSubHeadingListEnd
  \\vspace{{-4pt}}"""
        
        if coursework:
            # Escape special characters in coursework
            safe_coursework = [course.replace('%', '\\%').replace('&', '\\&') for course in coursework]
            coursework_text = ", ".join(safe_coursework)
            education_content += f"""
  Coursework: {coursework_text} \\vspace{{-4pt}}
  \\vspace{{-4pt}}"""
    
    education_content += "\n%-----------EDUCATION END-----------"
    return education_content

def generate_work_experience_template(work_experience_data):
    """Generate the work experience section"""
    if not work_experience_data:
        return ""
    
    work_content = """%-----------WORK EXPERIENCE---------------
\\section{Work Experience}
  \\resumeSubHeadingListStart"""
    
    for job in work_experience_data:
        company = job.get("company", "")
        job_title = job.get("jobTitle", "")
        location = job.get("location", "")
        duration = job.get("duration", "")
        bullet_points = job.get("bulletPoints", [])
        
        work_content += f"""
    \\workExSubheading{{{company}}}{{{job_title}}}{{{location}}}{{{duration}}} 
      \\resumeItemListStart"""
        
        # Handle both string and array formats for bullet points
        if isinstance(bullet_points, str):
            # If it's a string, split by newlines
            bullets = [line.strip() for line in bullet_points.split('\n') if line.strip()]
        else:
            # If it's already an array, use as is
            bullets = bullet_points or []
            
        for bullet in bullets:
            if bullet.strip():
                # Convert markdown bold to LaTeX properly
                bullet_latex = re.sub(r'\*\*(.*?)\*\*', r'\\textbf{\1}', bullet)
                # Escape special characters
                bullet_latex = bullet_latex.replace('%', '\\%').replace('&', '\\&')
                work_content += f"""
          \\resumeItem{{{bullet_latex}}}"""
        
        work_content += """
          \\resumeItemListEnd"""
    
    work_content += """
  \\resumeSubHeadingListEnd
\\vspace{-14pt}

%-----------WORK EXPERIENCE END-----------"""
    
    return work_content

def generate_projects_template(projects_data):
    """Generate the projects section"""
    if not projects_data:
        return ""
    
    projects_content = """%-----------PROJECTS-----------
\\section{Projects} 
  \\vspace{-5pt}
    \\resumeSubHeadingListStart"""
    
    for i, project in enumerate(projects_data):
        project_name = project.get("projectName", "")
        tech_stack = project.get("techStack", "")
        project_link = project.get("projectLink", "#")  # Default to # if no link provided
        link_text = project.get("linkText", "Link")  # Default to "Link" if no text provided
        bullet_points = project.get("bulletPoints", [])
        
        # Use custom link text if provided, otherwise use "Link"
        display_text = link_text.strip() if link_text and link_text.strip() else "Link"
        
        # Use actual project link if provided, otherwise use generic link
        if project_link and project_link != "#" and project_link.strip():
            link_section = f"\\emph{{\\href{{{project_link}}}{{{display_text}}}}}"
        else:
            link_section = f"\\emph{{\\href{{#}}{{{display_text}}}}}"
        
        # Convert comma-separated tech stack to pipe-separated format, then format with LaTeX symbols
        if ',' in tech_stack and '|' not in tech_stack:
            # Input is comma-separated, convert to pipe-separated
            tech_stack_pipes = ' | '.join([tech.strip() for tech in tech_stack.split(',') if tech.strip()])
        else:
            # Input is already pipe-separated or single technology
            tech_stack_pipes = tech_stack
        
        # Format tech stack with proper LaTeX pipe symbols
        tech_stack_formatted = tech_stack_pipes.replace('|', '$|$')
        
        projects_content += f"""
      \\resumeProjectHeading{{\\textbf{{{{{project_name}}}}} $|$ {link_section}}}{{{tech_stack_formatted}}} \\\\[5mm]
        \\resumeItemListStart"""
        
        # Handle both string and array formats for bullet points
        if isinstance(bullet_points, str):
            # If it's a string, split by newlines
            bullets = [line.strip() for line in bullet_points.split('\n') if line.strip()]
        else:
            # If it's already an array, use as is
            bullets = bullet_points or []
            
        for bullet in bullets:
            if bullet.strip():
                # Convert markdown bold to LaTeX properly
                bullet_latex = re.sub(r'\*\*(.*?)\*\*', r'\\textbf{\1}', bullet)
                # Escape special characters
                bullet_latex = bullet_latex.replace('%', '\\%').replace('&', '\\&')
                projects_content += f"""
          \\resumeItem{{{bullet_latex}}}"""
        
        projects_content += """
        \\resumeItemListEnd"""
        
        if i < len(projects_data) - 1:  # Add spacing between projects except last
            projects_content += """
      \\vspace{-20pt}"""
    
    projects_content += """
    \\resumeSubHeadingListEnd
    \\vspace{-20pt}
%-----------PROJECTS END-----------"""
    
    return projects_content


def generate_invisible_keywords_template(invisible_keywords):
    """Generate the invisible keywords section for ATS"""
    if not invisible_keywords:
        return ""
    
    # Escape special characters in invisible keywords
    safe_keywords = invisible_keywords.replace('%', '\\%').replace('&', '\\&')
    
    return f"""% Start invisible text (rendering mode 3 = invisible)
\\pdfliteral direct {{3 Tr}}
{safe_keywords}
% Restore normal rendering mode (0 = fill text)
\\pdfliteral direct {{0 Tr}}"""

def generate_complete_resume_template(resume_data):
    """Generate the complete resume from JSON data"""
    
    # Document header and packages
    document_header = """\\documentclass[letterpaper,8pt]{article}
\\usepackage{latexsym}
\\usepackage{titlesec}
\\usepackage{marvosym}
\\usepackage[usenames,dvipsnames]{color}
\\usepackage{verbatim}
\\usepackage{enumitem}
\\usepackage[hidelinks]{hyperref}
\\usepackage{fancyhdr}
\\usepackage[english]{babel}
\\usepackage{tabularx}
\\usepackage{fontawesome5}
\\usepackage{multicol}
\\setlength{\\multicolsep}{-3.0pt}
\\setlength{\\columnsep}{-1pt}
\\input{glyphtounicode}
\\usepackage[left=1.5cm, right=1.5cm, top=0.7cm, bottom=1.2cm]{geometry}
\\usepackage{accsupp}


\\pagestyle{fancy}
\\fancyhf{}
\\fancyfoot{}
\\renewcommand{\\headrulewidth}{0pt}
\\renewcommand{\\footrulewidth}{0pt}

% Adjust margins
\\addtolength{\\oddsidemargin}{-0.2in}
\\addtolength{\\textwidth}{0.35in}

\\urlstyle{same}

\\raggedbottom
\\raggedright
\\setlength{\\tabcolsep}{0in}

% Sections formatting
\\titleformat{\\section}{
  \\vspace{-4pt}\\scshape\\raggedright\\large\\bfseries
}{}{0em}{}[\\color{black}\\titlerule \\vspace{-5pt}]

% Ensure that generate pdf is machine readable/ATS parsable
\\pdfgentounicode=1

%-------------------------
% Custom commands
\\newcommand{\\resumeItem}[1]{
  \\item\\small{
    {#1 \\vspace{0pt}}
  }
}

\\newcommand{\\classesList}[4]{
  \\item\\small{
    {#1 #2 #3 #4 \\vspace{-2pt}}
  }
}

\\newcommand{\\resumeSubheading}[4]{
  \\vspace{-2pt}\\item
    \\begin{tabular*}{1.0\\textwidth}[t]{l@{\\extracolsep{\\fill}}r}
      \\textbf{#1} & \\textbf{\\small #2} \\\\
      \\textit{\\small#3} & \\textit{\\small #4} \\\\
    \\end{tabular*}\\vspace{-7pt}
}

\\newcommand{\\workExSubheading}[4]{
  \\vspace{-2pt}\\item
    \\begin{tabular*}{1.0\\textwidth}[t]{@{\\extracolsep{\\fill}}l r}
      \\textbf{#1}, \\textit{#2} $\\vert$ #3 & \\textit{\\small #4} \\\\
    \\end{tabular*}\\vspace{-7pt}
}

\\newcommand{\\resumeSubSubheading}[2]{
  \\item
  \\begin{tabular*}{0.97\\textwidth}{l@{\\extracolsep{\\fill}}r}
    \\textit{\\small#1} & \\textit{\\small #2} \\\\
  \\end{tabular*}\\vspace{-7pt}
}

\\newcommand{\\resumeProjectHeading}[2]{
  \\item
  \\begin{tabular*}{1.001\\textwidth}{l@{\\extracolsep{\\fill}}r}
    \\small#1 & \\textbf{\\small #2}\\\\
  \\end{tabular*}\\vspace{-7pt}
}

\\newcommand{\\resumeSubItem}[1]{\\resumeItem{#1}\\vspace{-4pt}}

\\renewcommand\\labelitemi{$\\vcenter{\\hbox{\\tiny$\\bullet$}}$}
\\renewcommand\\labelitemii{$\\vcenter{\\hbox{\\tiny$\\bullet$}}$}

\\newcommand{\\resumeSubHeadingListStart}{\\begin{itemize}[leftmargin=0.0in, label={}]}
\\newcommand{\\resumeSubHeadingListEnd}{\\end{itemize}}\\vspace{0pt}
\\newcommand{\\resumeItemListStart}{\\begin{itemize}[leftmargin=0.15in]}
\\newcommand{\\resumeItemListEnd}{\\end{itemize}\\vspace{-5pt}}



\\begin{document}

%----------HEADING----------

"""

    # Generate each section
    personal_info = resume_data.get("personalInfo", {})
    
    # Handle both old and new technical skills format
    technical_skills = resume_data.get("technicalSkills", {})
    technical_skills_categories = resume_data.get("technicalSkillsCategories", [])
    
    # Convert new format to old format if needed, preserving order
    if technical_skills_categories and not technical_skills:
        technical_skills = {}
        for category in technical_skills_categories:
            category_name = category.get("categoryName", "").strip()
            skills_text = category.get("skills", "").strip()
            if category_name and skills_text:
                # Split comma-separated skills into list
                skills_list = [skill.strip() for skill in skills_text.split(",") if skill.strip()]
                if skills_list:
                    technical_skills[category_name] = skills_list
    
    education = resume_data.get("education", [])
    certifications = resume_data.get("certifications", [])
    work_experience = resume_data.get("workExperience", [])
    projects = resume_data.get("projects", [])
    invisible_keywords = resume_data.get("invisibleKeywords", "")
    
    # Remove any existing Certifications category from technical_skills to avoid duplication
    # The certifications will be handled separately and added at the end if they exist
    if technical_skills and "Certifications" in technical_skills:
        del technical_skills["Certifications"]
    
    # Build the complete resume
    complete_resume = document_header
    complete_resume += generate_header_template(personal_info)
    complete_resume += "\n\n"
    complete_resume += generate_technical_skills_template(technical_skills, certifications, technical_skills_categories)
    complete_resume += "\n\n"
    complete_resume += generate_education_template(education)
    complete_resume += "\n\n"
    complete_resume += generate_work_experience_template(work_experience)
    complete_resume += "\n"
    complete_resume += generate_invisible_keywords_template(invisible_keywords)
    complete_resume += "\n\\vspace{-24pt}\n"
    complete_resume += generate_projects_template(projects)
    complete_resume += "\n\\vspace{10pt}\n\n\\vspace{-15pt}\n\n\n\n\\end{document}"
    
    return complete_resume
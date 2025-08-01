#!/usr/bin/env python3
"""
More robust LaTeX parser for extracting resume content
Handles nested braces and complex LaTeX structures better
"""

import re

def extract_balanced_braces(text, start_pos):
    """Extract content within balanced braces starting at start_pos"""
    if start_pos >= len(text) or text[start_pos] != '{':
        return None, start_pos
    
    brace_count = 0
    start = start_pos
    
    for i in range(start_pos, len(text)):
        if text[i] == '{':
            brace_count += 1
        elif text[i] == '}':
            brace_count -= 1
            if brace_count == 0:
                return text[start+1:i], i+1
    
    return None, start_pos

def extract_resume_items(content):
    """Extract all resumeItem content with proper brace handling"""
    items = []
    pos = 0
    
    while True:
        match = re.search(r'\\resumeItem\{', content[pos:])
        if not match:
            break
        
        start_pos = pos + match.start() + len('\\resumeItem{') - 1
        item_content, end_pos = extract_balanced_braces(content, start_pos)
        
        if item_content:
            # Clean up LaTeX formatting
            clean_content = re.sub(r'\\textbf\{([^}]*)\}', r'\1', item_content)
            clean_content = re.sub(r'\\[a-zA-Z]+\{([^}]*)\}', r'\1', clean_content)
            items.append(clean_content.strip())
        
        pos = end_pos if end_pos > pos else pos + 1
    
    return items

def parse_work_experience(content):
    """Parse work experience with better nested structure handling"""
    experiences = []
    
    # Find all workExSubheading entries
    pattern = r'\\workExSubheading\{([^}]+)\}\{([^}]+)\}\{([^}]+)\}\{([^}]+)\}'
    matches = re.finditer(pattern, content)
    
    for match in matches:
        company, job_title, location, duration = match.groups()
        
        # Find the content after this heading until the next heading or end
        start_pos = match.end()
        next_match = re.search(r'\\workExSubheading', content[start_pos:])
        end_pos = start_pos + next_match.start() if next_match else len(content)
        
        section_content = content[start_pos:end_pos]
        
        # Extract bullet points from this section
        bullet_points = extract_resume_items(section_content)
        
        experiences.append({
            "jobTitle": job_title.strip(),
            "company": company.strip(),
            "location": location.strip(), 
            "duration": duration.strip(),
            "bulletPoints": bullet_points
        })
    
    return experiences

def parse_projects(content):
    """Parse projects with better handling of complex structures"""
    projects = []
    
    # Find all resumeProjectHeading entries using the correct pattern that captures tech stack
    # This pattern matches the LAST set of braces which contains the tech stack
    pattern = r'\\resumeProjectHeading\{.*\}\{([^}]+)\}(?:\s*\\\\)'
    matches = list(re.finditer(pattern, content))
    
    for i, match in enumerate(matches):
        # Extract tech stack from the match
        tech_stack = match.group(1)
        
        # Get the full heading content to extract project name
        heading_start = match.start()
        heading_end = match.end()
        full_heading = content[heading_start:heading_end]
        
        # Extract project name from the complex structure
        # Look for \textbf{{Project Name}} pattern
        name_pattern = r'\\textbf\{\{([^}]+)\}\}'
        name_match = re.search(name_pattern, full_heading)
        if name_match:
            project_name = name_match.group(1)
        else:
            # Fallback: try to extract any text between first set of braces
            fallback_pattern = r'\\resumeProjectHeading\{([^{}]*)\}'
            fallback_match = re.search(fallback_pattern, full_heading)
            project_name = fallback_match.group(1) if fallback_match else "Unknown Project"
        
        # Find the content between this project and the next one
        content_start = heading_end
        if i + 1 < len(matches):
            content_end = matches[i + 1].start()
        else:
            content_end = len(content)
        
        # Extract the section content for bullet points
        section_content = content[content_start:content_end]
        
        # Extract bullet points from this section
        bullet_points = extract_resume_items(section_content)
        
        projects.append({
            "projectName": project_name.strip(),
            "techStack": tech_stack.strip(),
            "duration": "",
            "bulletPoints": bullet_points
        })
    
    return projects

def clean_latex_text(text):
    """Clean up LaTeX formatting from text"""
    # Remove common LaTeX commands
    text = re.sub(r'\\[a-zA-Z]+\{([^}]*)\}', r'\1', text)
    text = re.sub(r'\\[a-zA-Z]+', '', text)
    text = re.sub(r'\s+', ' ', text)
    return text.strip()
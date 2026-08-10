use axum::http::HeaderMap;

#[derive(Debug, Clone)]
pub struct ProjectHint {
    pub name: String,
    pub tool_id: String,
}

const TOOL_BY_UA: &[(&str, &str, &str)] = &[
    ("cursor", "Cursor", "cursor"),
    ("claude", "Claude Code", "claude-code"),
    ("codex", "OpenAI Codex", "codex"),
    ("windsurf", "Windsurf", "windsurf"),
    ("vscode", "VS Code", "vscode"),
];

pub fn from_headers(headers: &HeaderMap) -> Option<ProjectHint> {
    if let Some(v) = headers.get("x-project-id").and_then(|v| v.to_str().ok()) {
        let v = v.trim();
        if !v.is_empty() {
            return Some(ProjectHint {
                name: v.to_string(),
                tool_id: String::new(),
            });
        }
    }

    if let Some(v) = headers.get("x-tool-id").and_then(|v| v.to_str().ok()) {
        let v = v.trim().to_lowercase();
        for (id, name, tool_id) in TOOL_BY_UA {
            if *id == v {
                return Some(ProjectHint {
                    name: (*name).to_string(),
                    tool_id: (*tool_id).to_string(),
                });
            }
        }
        if !v.is_empty() {
            return Some(ProjectHint {
                name: v.clone(),
                tool_id: v,
            });
        }
    }

    let ua = headers
        .get(axum::http::header::USER_AGENT)
        .and_then(|v| v.to_str().ok())
        .unwrap_or("")
        .to_lowercase();
    for (id, name, tool_id) in TOOL_BY_UA {
        if ua.contains(id) {
            return Some(ProjectHint {
                name: (*name).to_string(),
                tool_id: (*tool_id).to_string(),
            });
        }
    }
    None
}

pub fn slug(name: &str) -> String {
    let mut out = String::with_capacity(name.len());
    for c in name.chars() {
        if c.is_alphanumeric() {
            out.extend(c.to_lowercase());
        } else if !out.ends_with('-') {
            out.push('-');
        }
    }
    out.trim_matches('-').to_string()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn slug_normalizes_names() {
        assert_eq!(slug("My Project!"), "my-project");
        assert_eq!(slug("Cursor"), "cursor");
        assert_eq!(slug(""), "");
    }

    #[test]
    fn detects_project_header() {
        let mut h = HeaderMap::new();
        h.insert("x-project-id", "my-app".parse().unwrap());
        let hint = from_headers(&h).unwrap();
        assert_eq!(hint.name, "my-app");
    }

    #[test]
    fn detects_tool_from_user_agent() {
        let mut h = HeaderMap::new();
        h.insert("user-agent", "cursor/0.45 xyz".parse().unwrap());
        let hint = from_headers(&h).unwrap();
        assert_eq!(hint.tool_id, "cursor");
        assert_eq!(hint.name, "Cursor");
    }

    #[test]
    fn no_headers_means_no_project() {
        assert!(from_headers(&HeaderMap::new()).is_none());
    }
}

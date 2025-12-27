from pathlib import Path
import yaml
from typing import Dict
import yaml

BASE_PROMPT_DIR = Path(__file__).resolve().parents[1] / "prompts"
print(BASE_PROMPT_DIR)

class PromptRegistry:
    def __init__(self):
        self.system_prompts: Dict[str, dict] = {}
        self.agent_prompts: Dict[str, dict] = {}

        self._load_all()

    def _load_yaml(self, path: Path) -> dict:
        data = yaml.safe_load(path.read_text(encoding="utf-8"))
        if not isinstance(data, dict) or "system_prompt" not in data:
            raise ValueError(
                f"Invalid prompt yaml: {path}, must contain 'system_prompt'"
            )
        return data

    def _load_dir(self, subdir: str) -> Dict[str, dict]:
        prompt_dir = BASE_PROMPT_DIR / subdir
        prompts = {}

        if not prompt_dir.exists():
            return prompts

        for file in prompt_dir.glob("*.yaml"):
            key = file.stem  # consultant / cover_letter
            prompts[key] = self._load_yaml(file)

        return prompts

    def _load_all(self):
        self.system_prompts = self._load_dir("system")
        self.agent_prompts = self._load_dir("agent")

    # ===== Public APIs =====

    def get_system_prompt(self, name: str) -> str:
        if name not in self.system_prompts:
            raise KeyError(f"System prompt '{name}' not found")
        return self.system_prompts[name]["system_prompt"]

    def get_agent_prompt(self, name: str) -> str:
        if name not in self.agent_prompts:
            raise KeyError(f"Agent prompt '{name}' not found")
        return self.agent_prompts[name]["system_prompt"]

    def list_system_prompts(self):
        return list(self.system_prompts.keys())

    def list_agent_prompts(self):
        return list(self.agent_prompts.keys())

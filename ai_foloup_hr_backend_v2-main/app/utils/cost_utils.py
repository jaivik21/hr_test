from __future__ import annotations

from dataclasses import dataclass, asdict
from typing import Any, Dict, Tuple
from config_loader import load_config

# Load cost configuration from config.yaml provider configs
_config = load_config()
_tts_config = _config.get("tts", {})
_stt_config = _config.get("stt", {})
_llm_config = _config.get("llm", {})

# Default values (fallback if config is missing)
ELEVENLABS_COST_PER_CHARACTER_DOLLARS = _tts_config.get("cost_per_character", 0.00022)
DEEPGRAM_COST_PER_MINUTE_DOLLARS = _stt_config.get("cost_per_minute", 0.006)
GPT4O_MINI_INPUT_COST_PER_TOKEN_DOLLARS = _llm_config.get("input_cost_per_token", 0.15 / 1_000_000)
GPT4O_MINI_OUTPUT_COST_PER_TOKEN_DOLLARS = _llm_config.get("output_cost_per_token", 0.60 / 1_000_000)


@dataclass
class CostBreakdown:
    elevenlabs_cost: float
    deepgram_cost: float
    llm_input_cost: float
    llm_output_cost: float
    azure_cost: float
    llm_prompt_tokens: int
    llm_completion_tokens: int
    question_characters: int
    duration_seconds: int

    @property
    def total_cost(self) -> float:
        return self.elevenlabs_cost + self.deepgram_cost + self.llm_input_cost + self.llm_output_cost

    def to_dict(self) -> Dict[str, Any]:
        payload = asdict(self)
        payload["total_cost"] = round(self.total_cost, 6)
        # Round monetary values for easier downstream consumption
        for key in ("elevenlabs_cost", "deepgram_cost", "llm_input_cost", "llm_output_cost", "azure_cost", "total_cost"):
            payload[key] = round(payload[key], 6)
        return payload


def _extract_duration_seconds(response) -> int:
    duration = getattr(response, "duration", None)
    if isinstance(duration, (int, float)) and duration > 0:
        return int(duration)

    start_time = getattr(response, "start_time", None)
    end_time = getattr(response, "end_time", None)
    if start_time and end_time:
        diff = (end_time - start_time).total_seconds()
        if diff > 0:
            return int(diff)
    return 0


def _extract_llm_tokens(response) -> Tuple[int, int]:
    prompt_tokens = 0
    completion_tokens = 0

    qa_history = getattr(response, "qa_history", None) or []
    if isinstance(qa_history, list):
        for qa in qa_history:
            if not isinstance(qa, dict):
                continue
            usage = qa.get("analysis_usage") or {}
            if isinstance(usage, dict):
                prompt_tokens += int(usage.get("prompt_tokens") or 0)
                completion_tokens += int(usage.get("completion_tokens") or 0)

    overall_analysis = getattr(response, "overall_analysis", None)
    if isinstance(overall_analysis, dict):
        usage = overall_analysis.get("_usage") or {}
        if isinstance(usage, dict):
            prompt_tokens += int(usage.get("prompt_tokens") or 0)
            completion_tokens += int(usage.get("completion_tokens") or 0)

    return prompt_tokens, completion_tokens


def _count_question_characters(response) -> int:
    total_chars = 0
    qa_history = getattr(response, "qa_history", None) or []
    if not isinstance(qa_history, list):
        return 0

    for qa in qa_history:
        if not isinstance(qa, dict):
            continue
        question = qa.get("question")
        if not question:
            continue
        total_chars += len(str(question))
    return total_chars


def calculate_response_cost(response) -> Dict[str, Any]:
    """
    Calculate the per-response cost using persisted metadata.

    Expected usage metadata:
      - For per-question analysis, `qa_history[i]["analysis_usage"]`
      - For final analysis, `response.overall_analysis["_usage"]`
    """
    question_chars = _count_question_characters(response)
    elevenlabs_cost = question_chars * ELEVENLABS_COST_PER_CHARACTER_DOLLARS

    duration_seconds = _extract_duration_seconds(response)
    duration_minutes = duration_seconds / 60 if duration_seconds > 0 else 0
    deepgram_cost = duration_minutes * DEEPGRAM_COST_PER_MINUTE_DOLLARS

    prompt_tokens, completion_tokens = _extract_llm_tokens(response)
    llm_input_cost = prompt_tokens * GPT4O_MINI_INPUT_COST_PER_TOKEN_DOLLARS
    llm_output_cost = completion_tokens * GPT4O_MINI_OUTPUT_COST_PER_TOKEN_DOLLARS
    azure_cost = llm_input_cost + llm_output_cost

    breakdown = CostBreakdown(
        elevenlabs_cost=elevenlabs_cost,
        deepgram_cost=deepgram_cost,
        llm_input_cost=llm_input_cost,
        llm_output_cost=llm_output_cost,
        azure_cost=azure_cost,
        llm_prompt_tokens=prompt_tokens,
        llm_completion_tokens=completion_tokens,
        question_characters=question_chars,
        duration_seconds=duration_seconds,
    )

    return breakdown.to_dict()


def apply_response_cost(response) -> Dict[str, Any]:
    """
    Convenience helper that calculates the response cost and assigns it to the model instance.
    """
    breakdown = calculate_response_cost(response)
    response.cost = breakdown.get("total_cost", 0.0)
    response.deepgram_cost = breakdown.get("deepgram_cost", 0.0)
    response.elevenlabs_cost = breakdown.get("elevenlabs_cost", 0.0)
    response.azure_cost = breakdown.get("azure_cost", 0.0)
    return breakdown


# Service layer for question-related business logic

from typing import Dict, List, Optional, Tuple
from sqlalchemy.orm.attributes import flag_modified
from utils.interview_utils import normalize_question, get_questions_list
from services.summarization_service import summarization_service
from services.llm_service import llm_service


class QuestionService:
    @staticmethod
    def safe_get_context(interview) -> str:
        return summarization_service.get_context_for_llm(interview.context) if interview.context else ""
    
    # @staticmethod
    # def get_difficulty_level(interview) -> str:
    #     return (interview.context or {}).get('difficulty_level', 'medium')
    
    @staticmethod
    async def commit_changes(db, model, *field_names):
        for field_name in field_names:
            flag_modified(model, field_name)
        await db.commit()
    
    @staticmethod
    async def handle_predefined_questions(
        interview, 
        db, 
        target_count: int, 
        context_for_llm: str
    ) -> Tuple[List[Dict], Optional[str]]:
        # difficulty = QuestionService.get_difficulty_level(interview)
        job_description = interview.job_description or ""
        name = interview.name or ""
        
        result = await llm_service._generate_predefined_questions(
            context_for_llm, target_count, job_description, name
        )
        
        usage = result.get('_usage') if isinstance(result, dict) else None
        questions = [normalize_question(q) for q in result.get('questions', [])[:target_count]]
        
        metadata = {"questions": questions}
        if usage and isinstance(usage, dict):
            metadata["_usage"] = {"predefined_generation": [usage]}
        interview.llm_generated_questions = metadata
        await QuestionService.commit_changes(db, interview, 'llm_generated_questions')
        
        return questions, None
    
    @staticmethod
    async def handle_manual_questions(
        interview, 
        db, 
        target_count: int
    ) -> List[Dict]:
        manual_list = interview.manual_questions if isinstance(interview.manual_questions, list) else []
        questions = [normalize_question(q) for q in manual_list][:target_count]
        
        interview.llm_generated_questions = {"questions": questions}
        await QuestionService.commit_changes(db, interview, 'llm_generated_questions')
        
        return questions
    
    @staticmethod
    def ensure_llm_questions_structure(interview):
        if not interview.llm_generated_questions:
            interview.llm_generated_questions = {"questions": []}
        elif not isinstance(interview.llm_generated_questions, dict):
            interview.llm_generated_questions = {"questions": []}
        elif "questions" not in interview.llm_generated_questions:
            interview.llm_generated_questions["questions"] = []
    
    @staticmethod
    async def add_dynamic_question_to_interview(
        interview, 
        db, 
        question: Dict
    ) -> None:
        QuestionService.ensure_llm_questions_structure(interview)
        
        normalized_q = normalize_question(question)
        existing_questions = interview.llm_generated_questions.get("questions", [])
        existing_questions.append(normalized_q)
        interview.llm_generated_questions["questions"] = existing_questions
        
        usage = None
        if isinstance(question, dict):
            usage = question.get("_usage")
        if usage and isinstance(usage, dict):
            usage_container = interview.llm_generated_questions.setdefault("_usage", {})
            usage_container.setdefault("dynamic_generation", []).append(usage)
            
        await QuestionService.commit_changes(db, interview, 'llm_generated_questions')
    
    @staticmethod
    async def generate_first_dynamic_question(
        interview, 
        db, 
        context_for_llm: str
    ) -> Optional[Dict]:
        # difficulty_level = QuestionService.get_difficulty_level(interview)
        generated = await llm_service._generate_dynamic_question(context_for_llm)
        
        if generated:
            first_q = generated[0] if isinstance(generated, list) else generated
            await QuestionService.add_dynamic_question_to_interview(interview, db, first_q)
            return first_q
        
        return None
    
    @staticmethod
    async def generate_next_dynamic_question(
        interview, 
        db, 
        previous_answers: List[Dict]
    ) -> Optional[Dict]:
        next_question = await llm_service.generate_next_dynamic_question(
            str(interview.id),
            previous_answers
        )
        
        if next_question and not next_question.get("error"):
            await QuestionService.add_dynamic_question_to_interview(interview, db, next_question)
            return next_question
        
        return next_question  


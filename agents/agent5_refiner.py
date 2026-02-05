"""
Agent 5: Refiner/Synthesizer - Model Fusion Expert

Uses INCREMENTAL GENERATION to avoid token limits:
1. First generates a plan (list of entities to create)
2. Then generates entities in batches of 3
3. Assembles the final structure
"""

import json
from typing import Type, List
from .base import BaseAgent
from .schemas import (
    RefinedStructureOutput,
    RefinedEntity,
    RefinedInfluence,
    EntityPlan,
    EntityBatchOutput,
    AnalysisOutput,
    EntityMapOutput,
    ScenarioOutput,
    ImpactAssessmentOutput
)

# Prompts for incremental generation
PLAN_PROMPT = """You are a system modeling expert. Plan a simulation model.

Given the analysis, list 5-6 MAIN entities for a simulation.
Choose entities with measurable variables and causal relationships.

Output ONLY this JSON (no markdown):
{
  "entities_to_generate": ["Entity1", "Entity2", "Entity3", "Entity4", "Entity5"],
  "total_count": 5
}

Rules:
- Maximum 6 entities
- Choose concrete, measurable entities
- Raw JSON only, no markdown
"""

BATCH_PROMPT = """Generate simulation model entities incrementally.

Generate components and influences for: {entities_to_generate}
Already generated: {completed_entities}
Remaining after this: {remaining_entities}

Context: {topic} ({domain})

Output ONLY this JSON:
{{
  "entities": [
    {{
      "name": "EntityName",
      "components": [
        {{"name": "var_name", "type": "state", "initial_value": 0.5, "min_value": 0, "max_value": 1, "description": "Brief desc"}}
      ]
    }}
  ],
  "influences": [
    {{"from_var": "Entity.var", "to_var": "Entity.var", "coefficient": 0.3, "kind": "positive", "function": "linear", "rationale": "Why"}}
  ],
  "is_complete": {is_complete},
  "remaining_entities": {remaining_json}
}}

CRITICAL RULES:
- Generate ONLY: {entities_to_generate}
- 2-3 components per entity
- Short descriptions (max 40 chars)
- EVERY entity MUST have at least one influence (in or out)
- Connect new entities to already completed entities when possible
- Raw JSON only
"""


class PlanAgent(BaseAgent[EntityPlan]):
    """Sub-agent for generating the entity plan."""
    
    def __init__(self, llm_client, max_retries: int = 3, temperature: float = 0.0):
        super().__init__(llm_client, max_retries, temperature)
    
    @property
    def system_prompt(self) -> str:
        return PLAN_PROMPT
    
    @property
    def output_schema(self) -> Type[EntityPlan]:
        return EntityPlan
    
    def process(self, prompt: str) -> EntityPlan:
        """Generate entity plan from prompt."""
        return self.generate(prompt)


class BatchAgent(BaseAgent[EntityBatchOutput]):
    """Sub-agent for generating entity batches."""
    
    def __init__(self, llm_client, max_retries: int = 3, temperature: float = 0.0):
        super().__init__(llm_client, max_retries, temperature)
        self._current_prompt = BATCH_PROMPT
    
    @property
    def system_prompt(self) -> str:
        return self._current_prompt
    
    @property
    def output_schema(self) -> Type[EntityBatchOutput]:
        return EntityBatchOutput
    
    def process(self, prompt: str) -> EntityBatchOutput:
        """Generate entity batch from prompt."""
        return self.generate(prompt)


class RefinerAgent(BaseAgent[RefinedStructureOutput]):
    """Agent 5: Synthesizes outputs using incremental generation."""
    
    BATCH_SIZE = 3  # Generate 3 entities at a time
    
    def __init__(self, llm_client, max_retries: int = 3, temperature: float = 0.0):
        super().__init__(llm_client, max_retries, temperature)
        self._plan_agent = PlanAgent(llm_client, max_retries, temperature)
        self._batch_agent = BatchAgent(llm_client, max_retries, temperature)
    
    @property
    def system_prompt(self) -> str:
        return PLAN_PROMPT
    
    @property
    def output_schema(self) -> Type[RefinedStructureOutput]:
        return RefinedStructureOutput
    
    def process(
        self,
        analysis: AnalysisOutput,
        entity_map: EntityMapOutput,
        scenarios: ScenarioOutput,
        impacts: ImpactAssessmentOutput
    ) -> RefinedStructureOutput:
        """
        Synthesize using incremental generation.
        
        1. Generate plan (list of entities)
        2. Generate entities in batches
        3. Assemble final structure
        """
        print(f"      🔄 Starting incremental generation...", flush=True)
        
        # Step 1: Generate the plan
        print(f"      📋 Step 1: Generating entity plan...", flush=True)
        plan_prompt = f"""Analyze and list 5-6 main entities needed:

Topic: {analysis.main_topic}
Domain: {analysis.domain}
Goals: {', '.join(analysis.goals[:3])}

Available from analysis: {entity_map.entities[:8]}

Select 5-6 most important for simulation."""

        plan = self._plan_agent.generate(plan_prompt)
        entities_to_generate = plan.entities_to_generate[:6]
        
        print(f"      ✅ Plan: {len(entities_to_generate)} entities: {entities_to_generate}", flush=True)
        
        # Step 2: Generate in batches
        all_entities: List[RefinedEntity] = []
        all_influences: List[RefinedInfluence] = []
        completed_entities: List[str] = []
        remaining = entities_to_generate.copy()
        
        batch_num = 0
        while remaining:
            batch_num += 1
            current_batch = remaining[:self.BATCH_SIZE]
            remaining = remaining[self.BATCH_SIZE:]
            
            print(f"      🔨 Batch {batch_num}: Generating {current_batch}...", flush=True)
            
            is_complete = len(remaining) == 0
            self._batch_agent._current_prompt = BATCH_PROMPT.format(
                entities_to_generate=current_batch,
                completed_entities=completed_entities if completed_entities else "None",
                remaining_entities=remaining if remaining else "None",
                topic=analysis.main_topic,
                domain=analysis.domain,
                is_complete=str(is_complete).lower(),
                remaining_json=json.dumps(remaining)
            )
            
            batch_input = f"""Generate: {current_batch}
Done: {completed_entities}
Remaining: {remaining}"""

            batch_result = self._batch_agent.generate(batch_input)
            
            all_entities.extend(batch_result.entities)
            all_influences.extend(batch_result.influences)
            completed_entities.extend([e.name for e in batch_result.entities])
            
            print(f"      ✅ Batch {batch_num}: {len(batch_result.entities)} entities, {len(batch_result.influences)} influences", flush=True)
        
        print(f"      🎉 Complete: {len(all_entities)} entities, {len(all_influences)} influences", flush=True)
        
        # Step 3: Validate connectivity - ensure all entities are connected
        all_influences = self._ensure_all_connected(all_entities, all_influences)
        
        print(f"      ✅ After connectivity check: {len(all_influences)} influences", flush=True)
        
        return RefinedStructureOutput(
            entities=all_entities,
            influences=all_influences,
            conflicts_resolved=[],
            optimizations_made=[f"Incremental generation in {batch_num} batches", "Connectivity validation"]
        )
    
    def _ensure_all_connected(
        self,
        entities: List[RefinedEntity],
        influences: List[RefinedInfluence]
    ) -> List[RefinedInfluence]:
        """
        Ensure every entity has at least one influence (in or out).
        Add missing connections if needed.
        """
        # Build set of connected entities
        connected = set()
        for inf in influences:
            # Extract entity names from "Entity.component" format
            from_entity = inf.from_var.split('.')[0] if '.' in inf.from_var else inf.from_var
            to_entity = inf.to_var.split('.')[0] if '.' in inf.to_var else inf.to_var
            connected.add(from_entity)
            connected.add(to_entity)
        
        # Find unconnected entities
        all_entity_names = {e.name for e in entities}
        unconnected = all_entity_names - connected
        
        if not unconnected:
            print(f"      ✅ All entities are connected!", flush=True)
            return influences
        
        print(f"      ⚠️  Unconnected entities: {unconnected}", flush=True)
        
        # Add connections for unconnected entities
        new_influences = list(influences)
        connected_list = list(connected)
        
        for entity_name in unconnected:
            # Find the entity and its first component
            entity = next((e for e in entities if e.name == entity_name), None)
            if not entity or not entity.components:
                continue
            
            entity_comp = f"{entity_name}.{entity.components[0].name}"
            
            # Find a connected entity to link with
            if connected_list:
                other_name = connected_list[0]
                other_entity = next((e for e in entities if e.name == other_name), None)
                if other_entity and other_entity.components:
                    other_comp = f"{other_name}.{other_entity.components[0].name}"
                    
                    # Create bidirectional influence
                    new_influences.append(RefinedInfluence(
                        from_var=entity_comp,
                        to_var=other_comp,
                        coefficient=0.2,
                        kind="positive",
                        function="linear",
                        rationale=f"Connection to integrate {entity_name} into system"
                    ))
                    print(f"      ➕ Added: {entity_comp} → {other_comp}", flush=True)
                    
                    connected.add(entity_name)
                    connected_list.append(entity_name)
        
        return new_influences

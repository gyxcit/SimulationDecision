"""
Output schemas for all agents in the Multi-Agent System V7.

Each schema defines the expected structure of an agent's JSON output.
"""

from typing import List, Dict, Optional, Literal
from pydantic import BaseModel, Field


# =============================================================================
# AGENT 1: ANALYZER
# =============================================================================

class AnalysisOutput(BaseModel):
    """Output from Agent 1: Analyzer (Understanding)."""
    
    main_topic: str = Field(..., description="Main topic of the system")
    domain: str = Field(..., description="Domain or field (e.g., education, healthcare)")
    goals: List[str] = Field(..., description="Primary goals of the system")
    context: str = Field(..., description="Contextual background")
    time_horizon: str = Field(..., description="Time horizon (e.g., short-term, long-term)")
    hidden_assumptions: List[str] = Field(
        default_factory=list,
        description="Implicit assumptions in the description"
    )


# =============================================================================
# AGENT 2: ENTITY EXPLORER
# =============================================================================

class EntityInfluence(BaseModel):
    """Represents an influence relationship between entities."""
    
    target_entity: str = Field(..., description="Entity being influenced")
    target_component: str = Field(..., description="Component being influenced")
    source_entity: str = Field(..., description="Entity causing the influence")
    source_component: str = Field(..., description="Component causing the influence")
    why: str = Field(..., description="Reason for the influence")
    how: str = Field(..., description="Mechanism of influence")
    when: str = Field(..., description="Timing or conditions")
    where: str = Field(default="", description="Location or context (optional)")


class EntityMapOutput(BaseModel):
    """Output from Agent 2: Entity Explorer (Causal Mapping)."""
    
    entities: List[str] = Field(..., description="List of identified entities")
    components: Dict[str, List[str]] = Field(
        ...,
        description="Components for each entity"
    )
    influences: List[EntityInfluence] = Field(
        ...,
        description="All influence relationships"
    )
    missing_stakeholders: List[str] = Field(
        default_factory=list,
        description="Potentially missing entities or stakeholders"
    )


# =============================================================================
# AGENT 3: EXTREME GENERATOR
# =============================================================================

class Scenario(BaseModel):
    """Represents a stress test scenario."""
    
    name: str = Field(..., description="Scenario name")
    type: Literal["worst_case", "best_case", "crisis", "breakdown", "unusual"] = Field(
        ...,
        description="Scenario type"
    )
    description: str = Field(..., description="Scenario description")
    affected_variables: List[str] = Field(
        ...,
        description="Variables affected in this scenario"
    )
    expected_behavior: str = Field(..., description="Expected system behavior")


class ScenarioOutput(BaseModel):
    """Output from Agent 3: Extreme Generator (Stress Testing)."""
    
    scenarios: List[Scenario] = Field(..., description="Generated stress test scenarios")
    missing_variables: List[str] = Field(
        default_factory=list,
        description="Variables that should exist but are missing"
    )
    missing_entities: List[str] = Field(
        default_factory=list,
        description="Entities that should exist but are missing"
    )


# =============================================================================
# AGENT 4: SOCIO-ECO-POLICY ANALYST
# =============================================================================

class ImpactAssessmentOutput(BaseModel):
    """Output from Agent 4: Socio-Eco-Policy Analyst (Impact Assessment)."""
    
    social_impact: str = Field(..., description="Assessment of social impacts")
    economic_impact: str = Field(..., description="Assessment of economic impacts")
    policy_governance: str = Field(
        ...,
        description="Policy and governance considerations"
    )
    environmental_effects: str = Field(
        default="",
        description="Environmental effects (if applicable)"
    )
    ethical_risks: List[str] = Field(
        default_factory=list,
        description="Identified ethical risks or concerns"
    )


# =============================================================================
# AGENT 5: REFINER / SYNTHESIZER
# =============================================================================

class RefinedComponent(BaseModel):
    """Refined component definition."""
    
    name: str
    type: Literal["state", "computed", "constant"]
    initial_value: float
    min_value: Optional[float] = None
    max_value: Optional[float] = None
    description: str


class RefinedEntity(BaseModel):
    """Refined entity definition."""
    
    name: str
    components: List[RefinedComponent]


class RefinedInfluence(BaseModel):
    """Refined influence relationship."""
    
    from_var: str = Field(..., description="Source variable (entity.component)")
    to_var: str = Field(..., description="Target variable (entity.component)")
    coefficient: float
    kind: Literal["positive", "negative", "decay", "ratio"]
    function: Literal["linear", "sigmoid", "threshold", "division"] = "linear"
    rationale: str = Field(default="", description="Explanation of this influence")


class RefinedStructureOutput(BaseModel):
    """Output from Agent 5: Refiner/Synthesizer (Fusion)."""
    
    entities: List[RefinedEntity] = Field(..., description="Final entity definitions")
    influences: List[RefinedInfluence] = Field(..., description="Final influence relationships")
    conflicts_resolved: List[str] = Field(
        default_factory=list,
        description="Conflicts that were resolved during synthesis"
    )
    optimizations_made: List[str] = Field(
        default_factory=list,
        description="Optimizations applied to the structure"
    )


# =============================================================================
# AGENT 7: TECHNICAL CRITIC
# =============================================================================

class Issue(BaseModel):
    """Represents a technical issue found in the model."""
    
    severity: Literal["low", "medium", "high", "critical"]
    category: Literal[
        "instability",
        "missing_feedback",
        "over_simplification",
        "numerical_risk",
        "other"
    ]
    description: str
    affected_components: List[str] = Field(default_factory=list)
    suggestion: str = Field(default="", description="Suggested fix")


class CritiqueOutput(BaseModel):
    """Output from Agent 7: Technical Critic (Validation)."""
    
    issues: List[Issue] = Field(default_factory=list, description="Identified issues")
    overall_quality: Literal["poor", "fair", "good", "excellent"]
    stability_score: float = Field(
        ...,
        ge=0.0,
        le=1.0,
        description="Estimated stability score (0-1)"
    )
    recommendations: List[str] = Field(
        default_factory=list,
        description="General recommendations"
    )


# =============================================================================
# AGENT 8: IMPACT REVIEWER
# =============================================================================

class ReviewOutput(BaseModel):
    """Output from Agent 8: Impact Reviewer (Final Approval)."""
    
    approved: bool = Field(..., description="Whether the model is approved")
    realism_score: float = Field(..., ge=0.0, le=1.0, description="Realism score (0-1)")
    safety_score: float = Field(..., ge=0.0, le=1.0, description="Safety score (0-1)")
    bias_concerns: List[str] = Field(
        default_factory=list,
        description="Identified biases or fairness concerns"
    )
    warnings: List[str] = Field(
        default_factory=list,
        description="Warnings about the model"
    )
    recommendations: List[str] = Field(
        default_factory=list,
        description="Recommendations for improvement"
    )
    social_acceptability: Literal["low", "medium", "high"] = Field(
        ...,
        description="Social acceptability level"
    )

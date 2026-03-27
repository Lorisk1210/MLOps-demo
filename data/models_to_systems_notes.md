# Session Notes - From Models to Systems

Source: `../slides/From Models to Systems - Challenges in Building AI Systems.pdf`

## Beyond the Model
- Machine learning models usually sit inside larger production systems rather than existing as isolated notebooks.
- Production systems include user interfaces, databases, monitoring, logging, and cloud infrastructure.
- The broader system around an ML model includes data pipelines, serving infrastructure, monitoring, logging, and resource management.

## Hidden Technical Debt
- Real ML systems are hard to maintain because dependencies extend far beyond training code.
- Reliability depends on the interactions between data, features, infrastructure, configuration, and deployment workflows.
- Modern platforms increasingly provide these system layers as managed services, APIs, or reusable frameworks.

## Practical MLOps Implication
- Students should reason about ML as an end-to-end socio-technical system, not only as model training.
- Testing, monitoring, and deployment controls matter because the model is only one component inside the larger service.


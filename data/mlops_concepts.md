# MLOps Key Concepts

## Hidden Technical Debt in Machine Learning Systems
A real-world ML system goes far beyond model training. The ML code is a tiny fraction of the overall system. Surrounding infrastructure includes: data collection, data verification, feature extraction, configuration, machine resource management, analysis tools, process management tools, serving infrastructure, and monitoring. These layers were once built in-house; today they are provided via platforms, APIs, and frameworks.

## Industrialization of AI Platforms
Early AI leaders (e.g., Uber, Meta, Airbnb) built custom, in-house ML platforms to move models from research into production at scale. These platforms addressed recurring needs: data pipelines and feature management, experiment tracking and model versioning, deployment, monitoring, and retraining. These capabilities are now industrialized and available as managed cloud platforms (e.g., AWS SageMaker, Google Vertex, Azure Machine Learning) and open-source frameworks (e.g., MLflow, Kubeflow, Airflow).

## Testing ML-Based Systems Goes Beyond Code
Testing ML systems involves validating: Code (correctness of implementation), Model (quality, robustness, stability, including prompt sensitivity), Data (quality, consistency, drift), and Infrastructure (scalability, configuration, and reliability). ML systems must be tested like software and like data pipelines.

## Model Risk in Production
Technical and data risks include bugs, data drift, and hidden incompatibilities. Operational risks include performance under load, misuse, and model degradation. Security and compliance risks include adversarial attacks, data leakage, and regulatory violations. Reputational risks include failures in production, loss of user trust, and public backlash. Risk increases with scale, automation, and environmental change.

## Safe Deployment
Production deployment requires control mechanisms: versioned releases, gradual rollout (canary releases, shadow deployments, A/B testing), fallback strategies (rollback to previous versions), and access control. Deployment should always be reversible.

## Monitoring and Feedback
Once deployed, AI systems must be continuously observed. Models operate in changing environments. Input data, user behavior, and system load evolve over time. Undetected issues can cause silent failures. The key shift is from offline evaluation to continuous validation. Monitoring covers data (input distributions, drift, anomalies), model behavior (performance degradation, unexpected outputs), system performance (latency, throughput, error rates), user interaction (misuse, feedback signals, edge cases), and cost/usage (especially critical for API-based and LLM systems).

## EU AI Act
The EU AI Act introduces a risk-based classification: Unacceptable Risk (prohibited, e.g. social scoring), High Risk (permitted subject to compliance requirements and conformity assessment, e.g. recruiting, medical devices), Transparency Obligations (permitted but subject to information obligations, e.g. impersonation), and Minimal or No Risk (permitted with no restrictions). High-risk AI systems require documented testing for robustness, bias, safety, and transparency.


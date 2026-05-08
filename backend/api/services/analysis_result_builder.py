class AnalysisResultBuilder:
    def __init__(self, xray):
        # Validate xray object
        if xray is None:
            raise ValueError("XRay object is required")

        self.xray = xray
        self.result = {}

    def add_basic_info(self):
        # Add basic X-ray information
        self.result["xray_id"] = self.xray.id
        self.result["image_url"] = self.xray.image.url if self.xray.image else None
        return self

    def add_report(self, report):
        # Add final report data
        if report is None:
            report = {}

        self.result["report"] = report
        return self

    def add_findings(self, findings):
        # Add general findings
        if findings is None:
            findings = []

        self.result["findings"] = findings
        return self

    def add_impacted_findings(self, impacted_findings):
        # Add impacted teeth findings
        if impacted_findings is None:
            impacted_findings = []

        self.result["impacted_findings"] = impacted_findings
        return self

    def add_lesion_findings(self, lesion_findings):
        # Add lesion findings
        if lesion_findings is None:
            lesion_findings = []

        self.result["lesion_findings"] = lesion_findings
        return self

    def add_recommendation(self, recommendation):
        # Add AI recommendation
        if recommendation is None:
            recommendation = ""

        self.result["recommendation"] = recommendation
        return self

    def build(self):
        # Return the final analysis result
        return self.result
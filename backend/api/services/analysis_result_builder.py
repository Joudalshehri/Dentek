class AnalysisResultBuilder: 
   def __init__(self, xray): 
       self.xray = xray 
       self.result = {} 
 
   def add_basic_info(self): 
       self.result["xray_id"] = self.xray.id 
       self.result["image_url"] = self.xray.image.url 
       return self 
 
   def add_report(self, report): 
       self.result["report"] = report 
       return self 
 
   def add_findings(self, findings): 
       self.result["findings"] = findings 
       return self 
 
   def add_impacted_findings(self, impacted_findings): 
       self.result["impacted_findings"] = impacted_findings 
       return self 
 
   def add_lesion_findings(self, lesion_findings): 
       self.result["lesion_findings"] = lesion_findings 
       return self 
 
   def add_recommendation(self, recommendation): 
       self.result["recommendation"] = recommendation 
       return self 
 
   def build(self): 
       return self.result 
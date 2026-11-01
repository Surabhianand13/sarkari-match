// The sections of the SSC CGL papers, with topics to start from. These are suggestions drawn from the usual syllabus, not the
// official one: check them against the latest notification, and upload the real syllabus under Factory sources so the factory
// writes and checks against it.

export type SubjectGuide = { subject: string; paper: string; topics: string[]; note?: string };

export const subjectGuide: SubjectGuide[] = [
  {
    subject: "Quantitative Aptitude",
    paper: "Tier I",
    topics: ["Percentage", "Profit and Loss", "Discount", "Simple Interest", "Compound Interest", "Ratio and Proportion", "Average", "Time and Work", "Pipes and Cisterns", "Time, Speed and Distance", "Mixture and Alligation", "Partnership", "Number System", "HCF and LCM", "Algebra", "Geometry", "Mensuration", "Trigonometry", "Height and Distance", "Data Interpretation"],
    note: "Data Interpretation is written as sets (choose Sets as the format)."
  },
  {
    subject: "General Intelligence and Reasoning",
    paper: "Tier I",
    topics: ["Analogy", "Classification", "Number Series", "Letter Series", "Coding-Decoding", "Blood Relations", "Direction Sense", "Syllogism", "Venn Diagrams", "Order and Ranking", "Mathematical Operations", "Matrix", "Missing Number", "Statement and Conclusion", "Calendar", "Clock", "Word Formation"],
    note: "Shape-based topics (mirror image, paper folding, embedded figures, dice) cannot be drawn by the factory: upload your own pictures on the question page."
  },
  {
    subject: "English Comprehension",
    paper: "Tier I",
    topics: ["Reading Comprehension", "Cloze Test", "Error Spotting", "Sentence Improvement", "Fill in the Blanks", "Synonyms", "Antonyms", "Idioms and Phrases", "One Word Substitution", "Active and Passive Voice", "Direct and Indirect Speech", "Spelling Correction", "Para Jumbles"],
    note: "Reading Comprehension and Cloze Test are written as sets. The English section stays in English, so it is not translated."
  },
  {
    subject: "General Awareness",
    paper: "Tier I",
    topics: ["History", "Geography", "Indian Polity", "Indian Economy", "Physics", "Chemistry", "Biology", "Static GK", "Current Affairs", "Awards and Honours", "Books and Authors", "Sports", "Important Days", "Government Schemes"],
    note: "A person checks every General Awareness question, because a correct-looking fact can still be wrong."
  },
  {
    subject: "Mathematical Abilities",
    paper: "Tier II",
    topics: ["Number System", "Percentage", "Profit and Loss", "Ratio and Proportion", "Time and Work", "Time, Speed and Distance", "Algebra", "Geometry", "Mensuration", "Trigonometry", "Statistics and Probability", "Data Interpretation"],
    note: "Checked with exact arithmetic like Quantitative Aptitude."
  },
  {
    subject: "Statistics",
    paper: "Tier II",
    topics: ["Collection and Presentation of Data", "Measures of Central Tendency", "Measures of Dispersion", "Skewness and Kurtosis", "Correlation and Regression", "Probability", "Random Variables and Distributions", "Sampling Theory", "Estimation", "Hypothesis Testing", "Index Numbers", "Time Series"],
    note: "Only for the posts that carry a Statistics paper."
  },
  {
    subject: "Finance and Economics",
    paper: "Tier II",
    topics: ["Financial Accounting Basics", "Financial Statements", "Ratio Analysis", "Depreciation", "Cost and Management Accounting", "Demand and Supply", "Elasticity", "Market Forms", "National Income", "Inflation", "Money and Banking", "Public Finance and Budget", "Taxation", "Indian Economy"],
    note: "A person checks every question, because the facts and definitions must be exact."
  },
  {
    subject: "Computer Knowledge",
    paper: "Tier II",
    topics: ["Computer Basics", "Hardware and Software", "Operating Systems", "MS Word", "MS Excel", "MS PowerPoint", "Internet and Email", "Networking", "Cyber Security", "Number Systems and Codes", "Databases", "Keyboard Shortcuts"],
    note: "A person checks every question."
  }
];

export const factorySubjects = subjectGuide.map((item) => item.subject);

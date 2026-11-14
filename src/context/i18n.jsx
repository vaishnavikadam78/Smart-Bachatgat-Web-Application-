import { createContext, useContext, useState } from "react";

// Translation dictionaries
const translations = {
  en: {
    // Navigation
    dashboard: "Dashboard",
    myLoans: "My Loans",
    mySavings: "My Savings",
    schemes: "Schemes",
    transactions: "Transactions",
    reports: "Reports",
    settings: "Settings",
    logout: "Logout",

    // Loan pages
    applyForLoan: "Apply for Loan",
    loanAmount: "Loan Amount",
    loanStatus: "Status",
    loanApplication: "Loan Application",
    pending: "Pending",
    approved: "Approved",
    rejected: "Rejected",
    active: "Active",
    closed: "Closed",

    // Savings
    totalSavings: "Total Savings",
    deposit: "Deposit",
    withdrawal: "Withdrawal",

    // Scheme
    availableSchemes: "Available Schemes",
    applyNow: "Apply Now",
    schemeDetails: "Scheme Details",
    schemeStatus: "Status",

    // Common
    submit: "Submit",
    cancel: "Cancel",
    save: "Save",
    delete: "Delete",
    edit: "Edit",
    view: "View",
    loading: "Loading...",
    error: "Error",
    success: "Success",
    noData: "No data found",
  },
  hi: {
    // Navigation
    dashboard: "डैशबोर्ड",
    myLoans: "मेरे कर्ज",
    mySavings: "मेरी बचत",
    schemes: "योजनाएं",
    transactions: "लेनदेन",
    reports: "रिपोर्टें",
    settings: "सेटिंग्स",
    logout: "लॉगआउट",

    // Loan pages
    applyForLoan: "कर्ज के लिए आवेदन करें",
    loanAmount: "कर्ज की राशि",
    loanStatus: "स्थिति",
    loanApplication: "कर्ज आवेदन",
    pending: "लंबित",
    approved: "स्वीकृत",
    rejected: "अस्वीकृत",
    active: "सक्रिय",
    closed: "बंद",

    // Savings
    totalSavings: "कुल बचत",
    deposit: "जमा",
    withdrawal: "निकासी",

    // Scheme
    availableSchemes: "उपलब्ध योजनाएं",
    applyNow: "अभी आवेदन करें",
    schemeDetails: "योजना विवरण",
    schemeStatus: "स्थिति",

    // Common
    submit: "जमा करें",
    cancel: "रद्द करें",
    save: "बचाएं",
    delete: "हटाएं",
    edit: "संपादित करें",
    view: "देखें",
    loading: "लोड हो रहा है...",
    error: "त्रुटि",
    success: "सफलता",
    noData: "कोई डेटा नहीं मिला",
  },
};

const LanguageContext = createContext();

export const LanguageProvider = ({ children }) => {
  const [language, setLanguage] = useState(() => {
    return localStorage.getItem("bachatgat_language") || "en";
  });

  const switchLanguage = (lang) => {
    setLanguage(lang);
    localStorage.setItem("bachatgat_language", lang);
  };

  const t = (key) => {
    return translations[language]?.[key] || translations.en?.[key] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, switchLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within LanguageProvider");
  }
  return context;
};

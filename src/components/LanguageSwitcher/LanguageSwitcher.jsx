import { useLanguage } from "../../context/LanguageContext";

const LANGS = [
  { code:"en", label:"English", flag:"🇬🇧" },
  { code:"hi", label:"हिंदी",   flag:"🇮🇳" },
  { code:"mr", label:"मराठी",   flag:"🇮🇳" },
  { code:"kn", label:"ಕನ್ನಡ",   flag:"🇮🇳" },
];

export default function LanguageSwitcher({ compact = false }) {
  const { lang, setLanguage } = useLanguage();

  if (compact) return (
    <select value={lang} onChange={e=>setLanguage(e.target.value)} style={{
      border:"1.5px solid #e2e8f0",borderRadius:8,padding:"5px 10px",
      fontSize:13,cursor:"pointer",background:"white",outline:"none",fontWeight:600
    }}>
      {LANGS.map(l=><option key={l.code} value={l.code}>{l.flag} {l.label}</option>)}
    </select>
  );

  return (
    <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
      {LANGS.map(l=>(
        <button key={l.code} onClick={()=>setLanguage(l.code)} style={{
          padding:"7px 16px",borderRadius:99,cursor:"pointer",fontWeight:600,fontSize:13,
          border:`1.5px solid ${lang===l.code?"#3b82f6":"#e2e8f0"}`,
          background:lang===l.code?"#3b82f6":"white",
          color:lang===l.code?"white":"#64748b",transition:"all .2s"
        }}>{l.flag} {l.label}</button>
      ))}
    </div>
  );
}
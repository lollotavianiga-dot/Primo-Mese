import React, { useState } from 'react';
import { Play, Headphones, Youtube, Globe } from 'lucide-react';

interface Course {
  id: string;
  title: string;
  description: string;
  language: string;
  videoId: string;
}

type Lang = 'en' | 'it' | 'de' | 'fr' | 'es';

const TRANSLATIONS: Record<Lang, {
  learning: string;
  desc: string;
  coursesSuffix: string;
  all: string;
  watch: string;
  listen: string;
  courses: Course[];
}> = {
  en: {
    learning: "LEARNING",
    desc: "Watch or listen to full technical courses directly in your editor.",
    coursesSuffix: "Courses",
    all: "All",
    watch: "Watch",
    listen: "Listen",
    courses: [
      { id: 'python-1', title: 'Python for Beginners - Full Course', description: 'Learn Python programming from scratch. Covers variables, data types, loops, functions, and more.', language: 'Python', videoId: 'rfscVS0vtbw' },
      { id: 'html-css-1', title: 'HTML & CSS Full Course', description: 'Master web development fundamentals by building real-world projects with HTML5 and CSS3.', language: 'HTML/CSS', videoId: 'mU6anWqZJcc' },
      { id: 'js-1', title: 'JavaScript Programming - Full Course', description: 'Deep dive into JavaScript. Learn DOM manipulation, asynchronous programming, closures and ES6+ features.', language: 'JavaScript', videoId: 'jS4aFq5-91M' },
      { id: 'c-1', title: 'C Programming Tutorial for Beginners', description: 'Learn the foundational concepts of computer science with the C programming language.', language: 'C', videoId: 'KJgsSFOSQv0' },
      { id: 'cpp-1', title: 'C++ Tutorial for Beginners', description: 'Comprehensive guide to C++ covering object-oriented programming, references, pointers, and memory management.', language: 'C++', videoId: 'vLnPwxZdW4Y' },
      { id: 'csharp-1', title: 'C# Tutorial - Full Course for Beginners', description: 'Learn C# and the .NET framework. Great for building Windows apps, games with Unity, and web backends.', language: 'C#', videoId: 'GhQdlIFylQ8' }
    ]
  },
  it: {
    learning: "APPRENDIMENTO",
    desc: "Guarda o ascolta corsi tecnici completi direttamente nel tuo editor.",
    coursesSuffix: "Corsi",
    all: "Tutti i",
    watch: "Guarda",
    listen: "Ascolta",
    courses: [
      { id: 'python-1', title: 'Python per principianti - Corso completo', description: 'Impara la programmazione Python da zero. Copre variabili, tipi di dati, cicli, funzioni e altro.', language: 'Python', videoId: 'rfscVS0vtbw' },
      { id: 'html-css-1', title: 'Corso completo HTML e CSS', description: 'Padroneggia i fondamenti dello sviluppo web creando progetti reali con HTML5 e CSS3.', language: 'HTML/CSS', videoId: 'mU6anWqZJcc' },
      { id: 'js-1', title: 'Programmazione JavaScript - Corso completo', description: 'Approfondimento su JavaScript. Impara la manipolazione del DOM, la programmazione asincrona, le closure e le funzionalità di ES6+.', language: 'JavaScript', videoId: 'jS4aFq5-91M' },
      { id: 'c-1', title: 'Tutorial di programmazione C per principianti', description: 'Impara i concetti fondamentali dell\'informatica con il linguaggio di programmazione C.', language: 'C', videoId: 'KJgsSFOSQv0' },
      { id: 'cpp-1', title: 'Tutorial C++ per principianti', description: 'Guida completa al C++ che copre la programmazione orientata agli oggetti, i riferimenti, i puntatori e la gestione della memoria.', language: 'C++', videoId: 'vLnPwxZdW4Y' },
      { id: 'csharp-1', title: 'Tutorial C# - Corso completo per principianti', description: 'Impara C# e il framework .NET. Ottimo per creare app Windows, giochi con Unity e backend web.', language: 'C#', videoId: 'GhQdlIFylQ8' }
    ]
  },
  de: {
    learning: "LERNEN",
    desc: "Sehen oder hören Sie sich vollständige technische Kurse direkt in Ihrem Editor an.",
    coursesSuffix: "Kurse",
    all: "Alle",
    watch: "Ansehen",
    listen: "Zuhören",
    courses: [
      { id: 'python-1', title: 'Python für Anfänger - Vollständiger Kurs', description: 'Lernen Sie die Python-Programmierung von Grund auf neu. Behandelt Variablen, Datentypen, Schleifen, Funktionen und mehr.', language: 'Python', videoId: 'rfscVS0vtbw' },
      { id: 'html-css-1', title: 'HTML & CSS Kompletter Kurs', description: 'Beherrschen Sie die Grundlagen der Webentwicklung, indem Sie reale Projekte mit HTML5 und CSS3 erstellen.', language: 'HTML/CSS', videoId: 'mU6anWqZJcc' },
      { id: 'js-1', title: 'JavaScript-Programmierung - Vollständiger Kurs', description: 'Tauchen Sie ein in JavaScript. Lernen Sie DOM-Manipulation, asynchrone Programmierung, Closures und ES6+-Funktionen kennen.', language: 'JavaScript', videoId: 'jS4aFq5-91M' },
      { id: 'c-1', title: 'C-Programmierung Tutorial für Anfänger', description: 'Lernen Sie die grundlegenden Konzepte der Informatik mit der Programmiersprache C.', language: 'C', videoId: 'KJgsSFOSQv0' },
      { id: 'cpp-1', title: 'C++ Tutorial für Anfänger', description: 'Umfassender Leitfaden zu C++, der objektorientierte Programmierung, Referenzen, Zeiger und Speicherverwaltung abdeckt.', language: 'C++', videoId: 'vLnPwxZdW4Y' },
      { id: 'csharp-1', title: 'C#-Tutorial - Vollständiger Kurs für Anfänger', description: 'Lernen Sie C# und das .NET-Framework. Ideal zum Erstellen von Windows-Apps, Spielen mit Unity und Web-Backends.', language: 'C#', videoId: 'GhQdlIFylQ8' }
    ]
  },
  fr: {
    learning: "APPRENTISSAGE",
    desc: "Regardez ou écoutez des cours techniques complets directement dans votre éditeur.",
    coursesSuffix: "Cours",
    all: "Tous les",
    watch: "Regarder",
    listen: "Écouter",
    courses: [
      { id: 'python-1', title: 'Python pour les débutants - Cours complet', description: 'Apprenez la programmation Python à partir de zéro. Couvre les variables, les types de données, les boucles, les fonctions et plus encore.', language: 'Python', videoId: 'rfscVS0vtbw' },
      { id: 'html-css-1', title: 'Cours complet HTML & CSS', description: 'Maîtrisez les principes de base du développement Web en créant des projets concrets avec HTML5 et CSS3.', language: 'HTML/CSS', videoId: 'mU6anWqZJcc' },
      { id: 'js-1', title: 'Programmation JavaScript - Cours complet', description: 'Plongée dans JavaScript. Apprenez la manipulation du DOM, la programmation asynchrone, les fermetures et les fonctionnalités ES6+.', language: 'JavaScript', videoId: 'jS4aFq5-91M' },
      { id: 'c-1', title: 'Tutoriel de programmation C pour les débutants', description: 'Apprenez les concepts fondamentaux de l\'informatique avec le langage de programmation C.', language: 'C', videoId: 'KJgsSFOSQv0' },
      { id: 'cpp-1', title: 'Tutoriel C++ pour les débutants', description: 'Guide complet du C++ couvrant la programmation orientée objet, les références, les pointeurs et la gestion de la mémoire.', language: 'C++', videoId: 'vLnPwxZdW4Y' },
      { id: 'csharp-1', title: 'Tutoriel C# - Cours complet pour débutants', description: 'Apprenez C# et le framework .NET. Idéal pour créer des applications Windows, des jeux avec Unity et des backends Web.', language: 'C#', videoId: 'GhQdlIFylQ8' }
    ]
  },
  es: {
    learning: "APRENDIZAJE",
    desc: "Mire o escuche cursos técnicos completos directamente en su editor.",
    coursesSuffix: "Cursos",
    all: "Todos los",
    watch: "Ver",
    listen: "Escuchar",
    courses: [
      { id: 'python-1', title: 'Python para principiantes - Curso completo', description: 'Aprenda la programación en Python desde cero. Cubre variables, tipos de datos, bucles, funciones y más.', language: 'Python', videoId: 'rfscVS0vtbw' },
      { id: 'html-css-1', title: 'Curso completo de HTML y CSS', description: 'Domine los fundamentos del desarrollo web creando proyectos del mundo real con HTML5 y CSS3.', language: 'HTML/CSS', videoId: 'mU6anWqZJcc' },
      { id: 'js-1', title: 'Programación en JavaScript - Curso completo', description: 'Inmersión profunda en JavaScript. Aprenda la manipulación del DOM, la programación asíncrona, los cierres y las características de ES6+.', language: 'JavaScript', videoId: 'jS4aFq5-91M' },
      { id: 'c-1', title: 'Tutorial de programación en C para principiantes', description: 'Aprenda los conceptos fundamentales de la informática con el lenguaje de programación C.', language: 'C', videoId: 'KJgsSFOSQv0' },
      { id: 'cpp-1', title: 'Tutorial de C++ para principiantes', description: 'Guía completa de C++ que cubre la programación orientada a objetos, referencias, punteros y gestión de memoria.', language: 'C++', videoId: 'vLnPwxZdW4Y' },
      { id: 'csharp-1', title: 'Tutorial de C# - Curso completo para principiantes', description: 'Aprenda C# y el framework .NET. Excelente para crear aplicaciones de Windows, juegos con Unity y backends web.', language: 'C#', videoId: 'GhQdlIFylQ8' }
    ]
  }
};

const LANGUAGES = ['Python', 'HTML/CSS', 'JavaScript', 'C', 'C++', 'C#'];

const Courses: React.FC = () => {
  const [filter, setFilter] = useState('All');
  const [uiLang, setUiLang] = useState<Lang>('it');

  const t = TRANSLATIONS[uiLang];
  const filteredCourses = t.courses.filter(c => filter === 'All' || c.language === filter);

  return (
    <div className="w-64 bg-[#252526] border-r border-gray-800 flex flex-col h-full select-none text-gray-300">
      <div className="h-9 px-3 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2 text-[11px] font-semibold text-gray-400 tracking-wider">
          <Youtube size={14} />
          <span>{t.learning}</span>
        </div>
        <div className="flex items-center text-gray-400 hover:text-gray-200 transition-colors">
          <Globe size={14} className="mr-1" />
          <select 
            className="bg-transparent text-[11px] outline-none cursor-pointer"
            value={uiLang}
            onChange={(e) => setUiLang(e.target.value as Lang)}
          >
            <option value="it">IT</option>
            <option value="en">EN</option>
            <option value="de">DE</option>
            <option value="fr">FR</option>
            <option value="es">ES</option>
          </select>
        </div>
      </div>

      <div className="p-3 flex-1 overflow-y-auto custom-scrollbar">
        <div className="mb-4 text-xs text-gray-400 leading-relaxed">
          {t.desc}
        </div>
        
        <select 
          className="w-full bg-[#3c3c3c] text-gray-300 border border-[#3c3c3c] rounded px-2 py-1 mb-4 text-xs outline-none focus:border-blue-500 transition-colors"
          value={filter} 
          onChange={(e) => setFilter(e.target.value)}
        >
          <option value="All">{t.all} {t.coursesSuffix}</option>
          {LANGUAGES.map(lang => (
            <option key={lang} value={lang}>{lang} {t.coursesSuffix}</option>
          ))}
        </select>

        <div className="flex flex-col gap-4">
          {filteredCourses.map(course => (
            <div key={course.id} className="bg-[#1e1e1e] border border-[#333] rounded overflow-hidden hover:border-blue-500 transition-colors group">
              <div className="relative w-full pt-[56.25%] bg-black">
                <iframe 
                  className="absolute top-0 left-0 w-full h-full border-none"
                  src={`https://www.youtube.com/embed/${course.videoId}`} 
                  title={course.title}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                  allowFullScreen
                />
              </div>
              <div className="p-3">
                <h3 className="m-0 mb-1 text-xs font-semibold text-white leading-tight">{course.title}</h3>
                <p className="m-0 text-[11px] text-gray-400 leading-snug line-clamp-3">{course.description}</p>
                <div className="flex gap-3 mt-3 text-blue-500 font-semibold text-[10px] uppercase">
                  <span className="flex items-center gap-1 group-hover:text-blue-400 transition-colors cursor-pointer"><Play size={10} /> {t.watch}</span>
                  <span className="flex items-center gap-1 group-hover:text-blue-400 transition-colors cursor-pointer"><Headphones size={10} /> {t.listen}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Courses;

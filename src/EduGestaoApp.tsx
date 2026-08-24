/**
 * EduGestão - Colégio Presbiteriano da Penha
 * Plataforma de Educação Clássica Cristã
 */
import { useState, useEffect } from "react";
import schoolLogo from "@/assets/school-logo.jpeg";
import schoolShield from "@/assets/school-shield.png";
import { 
  LayoutDashboard, 
  Users, 
  CalendarCheck, 
  UserPlus, 
  AlertCircle, 
  Briefcase, 
  BookOpen, 
  Folder, 
  Database, 
  Settings,
  Menu,
  Search,
  Bell,
  X,
  DollarSign,
  TrendingUp,
  MessageSquare,
  Package,
  FileText,
  Clock,
  CheckCircle
} from "lucide-react";
import { Toaster, toast } from "sonner";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';

// --- Helpers ---

/**
 * Opens a document stored as a base64 data URL by converting it to a Blob URL first.
 * Navigating directly to a `data:` URL in a new tab is unreliable (many browsers,
 * Chrome included, block or blank-render large/data-image navigations). Blob URLs
 * open reliably and also give the file a proper name when downloaded/saved.
 */
const openDocument = (fileUrl: string, fileName: string = "documento") => {
  try {
    const [header, base64] = fileUrl.split(",");
    const mimeMatch = header?.match(/data:(.*?);base64/);
    const mime = mimeMatch?.[1] || "application/octet-stream";
    const byteChars = atob(base64);
    const byteNumbers = new Array(byteChars.length);
    for (let i = 0; i < byteChars.length; i++) {
      byteNumbers[i] = byteChars.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: mime });
    const blobUrl = URL.createObjectURL(blob);
    const opened = window.open(blobUrl, "_blank", "noopener,noreferrer");
    if (!opened) {
      // Popup blocked — fall back to a forced download so the user still gets the file
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      link.remove();
    }
    setTimeout(() => URL.revokeObjectURL(blobUrl), 60000);
  } catch (err) {
    console.error(err);
    toast.error("Não foi possível abrir o arquivo.");
  }
};

// --- Types ---


type StudentDocument = {
  id: string;
  name: string;
  type: 'child' | 'guardian' | 'pickup';
  fileUrl?: string;
  status: 'pending' | 'submitted' | 'verified';
};

type Pickup = { 
  id: string;
  name: string; 
  relation: string; 
  document: string; 
  photo?: string;
  documentPhoto?: string; 
};

type Occurrence = {
  id: string;
  studentId: number;
  studentName: string;
  classroom: string;
  date: string;
  subject: string; // Theme/Type
  description: string;
  severity: 'low' | 'medium' | 'high';
};

type Student = {
  id: number;
  name: string;
  birthDate?: string;
  documentNumber?: string; // RG or Birth Certificate
  parentage?: string;
  address?: string;
  classroom: string;
  guardian: string;
  phone: string;
  emergencyName: string;
  emergencyPhone: string;
  medical: string;
  allergies: string;
  occurrences: Occurrence[];
  pickups: Pickup[];
  documentsComplete: boolean;
  documents?: StudentDocument[];
  modality: 'integral' | 'meio-periodo';
  level: 'infantil' | 'fundamental';
  financialStatus: 'paid' | 'pending' | 'overdue';
  academicStatus: 'progression' | 'approval' | 'recovery' | 'failure';
};

type EmployeeDocument = {
  id: string;
  name: string;
  type: 'rg' | 'cpf' | 'comp_end' | 'curriculo' | 'certificacoes';
  fileUrl?: string;
  status: 'pending' | 'verified';
};

type Employee = {
  id: number;
  name: string;
  role: string;
  cpf: string;
  rg: string;
  pis: string;
  address: string;
  documents: EmployeeDocument[];
  qualifications: string;
  trainingProgress: number; // 0-100
  attendance: number; // 0-100
};

type MaterialTransaction = {
  id: string;
  materialId: number;
  type: 'in' | 'out';
  quantity: number;
  date: string;
  sourceOrDest: string; // Supplier for 'in', Classroom/Target for 'out'
  reason?: string;
  recordedBy: string;
};

type Material = {
  id: number;
  name: string;
  quantity: number;
  minQuantity: number;
  category: string;
  price?: number | undefined;
};

type AttendanceRecord = {
  id: string;
  date: string;
  studentId: number;
  status: 'present' | 'absent';
};

type Meeting = {
  id: number;
  date: string;
  studentId: number;
  observations: string;
  participants: string;
};

type StudyProgress = {
  id: string;
  studentId: number;
  date: string;
  progress: number; // 0-100
  description: string;
  recordedBy: string;
};


// --- Logo Component ---
const Logo = ({ className = "" }: { className?: string }) => (
  <div className={`flex items-center gap-4 ${className}`}>
    <div className="relative group">
      <div className="absolute -inset-1 bg-gradient-to-br from-[#1a2f4e] to-[#c5a059] rounded-2xl blur opacity-20 group-hover:opacity-40 transition duration-500" />
      <div className="relative w-14 h-14 bg-white rounded-2xl flex items-center justify-center shadow-lg transform group-hover:scale-105 transition-transform duration-500 overflow-hidden border border-gray-100 p-2">
        <img src={schoolShield} alt="Colégio Presbiteriano da Penha Logo" className="w-full h-full object-contain" />
      </div>
    </div>
    <div className="flex flex-col">
      <h1 className="text-xl font-black tracking-tight text-[#1a2f4e] leading-tight">
        COLÉGIO<br/>PRESBITERIANO
      </h1>
      <div className="flex items-center gap-2 mt-1">
        <div className="h-[2px] w-8 bg-[#c5a059]" />
        <span className="text-[10px] font-black tracking-[0.1em] text-[#c5a059] uppercase">DA PENHA</span>
      </div>
    </div>
  </div>
);

export default function EduGestaoApp() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [students, setStudents] = useState<Student[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [occurrences, setOccurrences] = useState<Occurrence[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [studyProgress, setStudyProgress] = useState<StudyProgress[]>([]);
  const [meetings, setMeetings] = useState<any[]>([]);


  // --- Persistence ---
  useEffect(() => {
    const savedStudents = localStorage.getItem("edugestao-students-v2");
    const savedEmployees = localStorage.getItem("edugestao-employees-v2");
    const savedOccurrences = localStorage.getItem("edugestao-occurrences-v2");
    const savedAttendance = localStorage.getItem("edugestao-attendance-v2");
    const savedProgress = localStorage.getItem("edugestao-study-progress-v2");
    const savedMeetings = localStorage.getItem("edugestao-meetings-v2");
    if (savedStudents) {

      setStudents(JSON.parse(savedStudents));
    } else {
      // Seed initial data if empty
      const initialStudents: Student[] = [
        {
          id: 1,
          name: "Enzo Gabriel Santos",
          birthDate: "2018-05-15",
          documentNumber: "123.456.789-X",
          parentage: "Renata Santos e Paulo Santos",
          address: "Rua das Palmeiras, 45",
          classroom: "1º Ano A",
          guardian: "Renata Santos",
          phone: "(11) 98888-7777",
          emergencyName: "Ricardo Santos",
          emergencyPhone: "(11) 97777-6666",
          medical: "Nenhum",
          allergies: "Lactose",
          occurrences: [],
          pickups: [],
          documentsComplete: true,
          modality: 'integral',
          level: 'fundamental',
          financialStatus: 'paid',
          academicStatus: 'progression',
          documents: [
            { id: '1', name: 'Certidão de Nascimento', type: 'child', status: 'verified' },
            { id: '2', name: 'CPF do Responsável', type: 'guardian', status: 'verified' }
          ]
        },
        {
          id: 2,
          name: "Valentina Oliveira",
          birthDate: "2019-08-22",
          documentNumber: "55.666.777-8",
          parentage: "Carla Oliveira",
          address: "Av. Brasil, 1000",
          classroom: "2º Ano B",
          guardian: "Carla Oliveira",
          phone: "(11) 96666-5555",
          emergencyName: "Marcos Oliveira",
          emergencyPhone: "(11) 95555-4444",
          medical: "Asma",
          allergies: "Nenhuma",
          occurrences: [{ id: '1', date: '2026-08-01', studentId: 2, studentName: "Valentina Oliveira", classroom: "2º Ano B", subject: "Comportamento", description: "Atraso na entrada", severity: 'low' }],
          pickups: [],
          documentsComplete: false,
          modality: 'meio-periodo',
          level: 'infantil',
          financialStatus: 'pending',
          academicStatus: 'recovery',
          documents: [
            { id: '3', name: 'Carteira de Vacinação', type: 'child', status: 'pending' }
          ]
        },
        {
          id: 3,
          name: "Miguel Pereira",
          birthDate: "2017-03-10",
          documentNumber: "99.888.777-6",
          parentage: "Juliana Pereira",
          address: "Rua Ceará, 200",
          classroom: "3º Ano C",
          guardian: "Juliana Pereira",
          phone: "(11) 94444-3333",
          emergencyName: "Roberto Pereira",
          emergencyPhone: "(11) 93333-2222",
          medical: "Nenhum",
          allergies: "Amendoim",
          occurrences: [],
          pickups: [],
          documentsComplete: true,
          modality: 'integral',
          level: 'fundamental',
          financialStatus: 'overdue',
          academicStatus: 'approval',
        }
      ];
      setStudents(initialStudents);
      localStorage.setItem("edugestao-students-v2", JSON.stringify(initialStudents));
    }

    if (savedEmployees) {
      setEmployees(JSON.parse(savedEmployees));
    } else {
      const initialEmployees: Employee[] = [
        {
          id: 1,
          name: "Luciana Braga",
          role: "Professora",
          cpf: "123.456.789-00",
          rg: "12.345.678-9",
          pis: "12345678901",
          address: "Rua das Flores, 123",
          documents: [
            { id: '1', name: 'RG', type: 'rg', status: 'verified' },
            { id: '2', name: 'CPF', type: 'cpf', status: 'verified' }
          ],
          qualifications: "Pedagogia",
          trainingProgress: 100,
          attendance: 98,
        }
      ];
      setEmployees(initialEmployees);
      localStorage.setItem("edugestao-employees-v2", JSON.stringify(initialEmployees));
    }

    if (savedOccurrences) {
      setOccurrences(JSON.parse(savedOccurrences));
    } else {
      const initialOccurrences: Occurrence[] = [
        {
          id: '1',
          studentId: 2,
          studentName: "Valentina Oliveira",
          classroom: "2º Ano B",
          date: '2026-08-01',
          subject: "Comportamento",
          description: "Atraso na entrada",
          severity: 'low'
        }
      ];
      setOccurrences(initialOccurrences);
      localStorage.setItem("edugestao-occurrences-v2", JSON.stringify(initialOccurrences));
    }

    if (savedAttendance) {
      setAttendanceRecords(JSON.parse(savedAttendance));
    } else {
      const initialAttendance: AttendanceRecord[] = [
        { id: '1', date: '2026-08-01', studentId: 1, status: 'present' },
        { id: '2', date: '2026-08-01', studentId: 2, status: 'absent' },
        { id: '3', date: '2026-08-02', studentId: 2, status: 'absent' },
      ];
      setAttendanceRecords(initialAttendance);
      localStorage.setItem("edugestao-attendance-v2", JSON.stringify(initialAttendance));
    }

    if (savedProgress) {
      const parsedProgress = JSON.parse(savedProgress) as StudyProgress[];
      // Filter out progress from previous years (expires in January)
      const currentYear = new Date().getFullYear();
      const validProgress = parsedProgress.filter(p => {
        const pDate = new Date(p.date);
        return pDate.getFullYear() === currentYear;
      });
      setStudyProgress(validProgress);
      if (validProgress.length !== parsedProgress.length) {
        localStorage.setItem("edugestao-study-progress-v2", JSON.stringify(validProgress));
      }
    }

    if (savedMeetings) {
      setMeetings(JSON.parse(savedMeetings));
    } else {
      const initialMeetings = [
        { 
          id: 1, 
          date: '2026-08-15', 
          time: '14:00',
          title: 'Reunião de Turma - 1º Ano A', 
          responsible: 'Profa. Luciana',
          pauta: 'Desenvolvimento pedagógico, materiais escolares e próximos eventos da primavera.',
          month: 'AGO',
          day: '15'
        }
      ];
      setMeetings(initialMeetings);
      localStorage.setItem("edugestao-meetings-v2", JSON.stringify(initialMeetings));
    }
  }, []);


  const saveAttendance = (newRecords: AttendanceRecord[]) => {
    setAttendanceRecords(newRecords);
    localStorage.setItem("edugestao-attendance-v2", JSON.stringify(newRecords));
  };

  const saveStudyProgress = (newProgress: StudyProgress[]) => {
    setStudyProgress(newProgress);
    localStorage.setItem("edugestao-study-progress-v2", JSON.stringify(newProgress));
  };


  const saveStudents = (newStudents: Student[]) => {
    setStudents(newStudents);
    localStorage.setItem("edugestao-students-v2", JSON.stringify(newStudents));
    toast.success("Dados dos alunos atualizados com sucesso!");
  };

  const saveOccurrences = (newOccurrences: Occurrence[]) => {
    setOccurrences(newOccurrences);
    localStorage.setItem("edugestao-occurrences-v2", JSON.stringify(newOccurrences));
    toast.success("Ocorrências atualizadas com sucesso!");
  };

  const addStudent = (newStudent: Omit<Student, 'id'>) => {
    const studentWithId = { ...newStudent, id: Date.now() };
    saveStudents([...students, studentWithId]);
  };

  const menuItems = [
    { id: "dashboard", label: "Visão geral", icon: LayoutDashboard },
    { id: "students", label: "Alunos", icon: Users },
    { id: "admissions", label: "Matrículas", icon: UserPlus },
    { id: "financial", label: "Financeiro", icon: DollarSign },
    { id: "academic", label: "Desenvolvimento", icon: TrendingUp },
    { id: "attendance", label: "Frequência", icon: CalendarCheck },
    { id: "meetings", label: "Reunião de Pais", icon: MessageSquare },
    { id: "materials", label: "Controle de Materiais", icon: Package },
    { id: "employees", label: "Funcionários", icon: Briefcase },
    { id: "backup", label: "Backup", icon: Database },
    { id: "occurrences", label: "Ocorrências", icon: AlertCircle },
  ];

  const renderContent = () => {
    switch (activeTab) {
      case "dashboard":
        return <Dashboard students={students} employees={employees} meetings={meetings} setActiveTab={setActiveTab} />;
      case "students":
        return <StudentsModule students={students} onSave={saveStudents} />;
      case "admissions":
        return <AdmissionsModule students={students} onAddStudent={addStudent} />;
      case "financial":
        return <FinancialModule students={students} onSave={saveStudents} />;

      case "academic":
        return (
          <AcademicModule 
            students={students} 
            occurrences={occurrences} 
            studyProgress={studyProgress}
            onSaveProgress={saveStudyProgress}
            setActiveTab={setActiveTab} 
          />
        );

      case "occurrences":
        return <OccurrencesModule students={students} occurrences={occurrences} onSave={saveOccurrences} />;
      case "attendance":
        return <AttendanceModule students={students} attendanceRecords={attendanceRecords} onSaveAttendance={saveAttendance} />;
      case "meetings":
        return <MeetingsModule students={students} meetings={meetings} onSaveMeetings={(newMeetings) => {
          setMeetings(newMeetings);
          localStorage.setItem("edugestao-meetings-v2", JSON.stringify(newMeetings));
        }} />;
      case "materials":
        return <MaterialsModule />;
      case "employees":
        return <EmployeesModule 
          employees={employees} 
          onSave={(newEmps) => {
            setEmployees(newEmps);
            localStorage.setItem("edugestao-employees-v2", JSON.stringify(newEmps));
            toast.success("Dados dos funcionários atualizados!");
          }} 
        />;
      default:
        return (
          <div className="flex flex-col items-center justify-center h-full text-gray-500 py-20">
            <h2 className="text-2xl font-semibold mb-2">Seção em desenvolvimento</h2>
            <p>A seção "{menuItems.find(i => i.id === activeTab)?.label}" estará disponível em breve.</p>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-[#f7f8fc] flex text-gray-800 font-sans">
      <Toaster position="bottom-right" />
      
      {/* Sidebar Overlay (Mobile) */}
      {isSidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 md:hidden" onClick={() => setIsSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-[280px] bg-white border-r border-gray-100 transition-transform duration-300 md:translate-x-0 ${isSidebarOpen ? "translate-x-0" : "-translate-x-full"} flex flex-col`}>
        <div className="p-8">
          <Logo />
        </div>

        <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => { setActiveTab(item.id); setIsSidebarOpen(false); }}
              className={`w-full flex items-center gap-4 px-6 py-4 rounded-[20px] transition-all duration-300 ${activeTab === item.id ? "bg-[#1a2f4e] text-white shadow-xl shadow-[#1a2f4e]/20 font-bold translate-x-1" : "text-gray-400 hover:text-[#1a2f4e] hover:bg-gray-50"}`}
            >
              <item.icon size={22} className={activeTab === item.id ? "text-white" : "text-gray-300"} />
              <span className="text-[15px]">{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="p-6 border-t border-gray-50">
          <button onClick={() => setActiveTab("settings")} className="w-full flex items-center gap-4 px-6 py-4 rounded-[20px] text-gray-400 hover:text-[#1a2f4e] hover:bg-gray-50 transition-all duration-300">
            <Settings size={22} className="text-gray-300" />
            <span className="text-[15px]">Configurações</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 md:ml-[280px] min-h-screen flex flex-col">
        <header className="h-20 sm:h-24 bg-white/80 backdrop-blur-md border-b border-gray-100 flex items-center justify-between px-4 sm:px-8 sticky top-0 z-30">
          <div className="flex items-center gap-3 sm:gap-6">
            <button className="md:hidden p-3 hover:bg-gray-100 rounded-2xl transition-colors" onClick={() => setIsSidebarOpen(true)}>
              <Menu size={24} className="text-[#1a2f4e]" />
            </button>
            <div className="relative hidden lg:block w-96">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={20} />
              <input type="text" placeholder="Pesquisar em toda a plataforma..." className="w-full bg-gray-50 border-none rounded-2xl pl-12 pr-6 py-3.5 text-sm focus:ring-2 focus:ring-[#1a2f4e]/20 outline-none transition-all placeholder:text-gray-300" />
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-6">
            <div className="flex items-center gap-2">
              <button className="p-3 text-gray-400 hover:text-[#1a2f4e] hover:bg-[#1a2f4e]/5 rounded-2xl transition-all relative">
                <Bell size={22} />
                <span className="absolute top-3.5 right-3.5 w-2 h-2 bg-[#f06d5e] rounded-full ring-4 ring-white"></span>
              </button>
              <button className="p-3 text-gray-400 hover:text-[#1a2f4e] hover:bg-[#1a2f4e]/5 rounded-2xl transition-all">
                <Settings size={22} />
              </button>
            </div>
            
            <div className="flex items-center gap-2 sm:gap-4 pl-3 sm:pl-6 border-l border-gray-100">
              <div className="text-right hidden sm:block">
                <p className="text-[15px] font-black text-[#1a2f4e]">Nataly Wingerter</p>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Diretora Administrativa</p>
              </div>
              <div className="w-12 h-12 bg-gradient-to-tr from-[#1a2f4e] to-[#2a4a7a] rounded-2xl flex items-center justify-center text-white font-black shadow-lg shadow-[#1a2f4e]/20 border-2 border-white ring-1 ring-[#1a2f4e]/10">NW</div>
            </div>
          </div>
        </header>

        <div className="flex-1 p-4 sm:p-8 md:p-12 max-w-[1600px] mx-auto w-full">
          {renderContent()}
        </div>
      </main>

      <style dangerouslySetInnerHTML={{ __html: `
        .bg-coral-gradient { background: linear-gradient(135deg, #f06d5e 0%, #d85a4b 100%); }
      `}} />
    </div>
  );
}

function Dashboard({ students, employees, meetings, setActiveTab }: { students: Student[], employees: Employee[], meetings: any[], setActiveTab: (tab: string) => void }) {
  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-8 rounded-[32px] border border-gray-100 shadow-sm relative overflow-hidden">
        <div className="relative z-10">
          <Logo className="mb-6 scale-110 origin-left" />
          <p className="text-gray-500 font-medium max-w-md text-lg italic border-l-4 border-[#c5a059] pl-4">
            "Educação Clássica Cristã: Formando mentes e corações para a glória de Deus."
          </p>
        </div>
        <div className="flex items-center gap-3 relative z-10">
          <div className="bg-[#1a2f4e]/5 p-4 rounded-2xl">
            <TrendingUp className="text-[#1a2f4e]" size={32} />
          </div>
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Performance Geral</p>
            <p className="text-2xl font-black text-[#1a2f4e]">+12.5% <span className="text-sm font-medium text-gray-400">este mês</span></p>
          </div>
        </div>
        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-[#1a2f4e]/5 to-transparent rounded-full -mr-20 -mt-20 blur-3xl"></div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: "Total de Alunos", value: students.length, color: "#1a2f4e", icon: Users, sub: "Ativos no sistema" },
          { label: "Presença Média", value: "94%", color: "#2cb7a5", icon: CalendarCheck, sub: "Frequência escolar" },
          { label: "Mensalidades", value: students.filter(s => s.financialStatus === 'overdue').length, color: "#f06d5e", icon: DollarSign, sub: "Pendências em aberto" },
          { label: "Documentação", value: students.filter(s => !s.documentsComplete).length, color: "#ef9f2f", icon: Folder, sub: "Arquivos pendentes" },
        ].map((kpi, idx) => (
          <div key={idx} className="bg-white p-7 rounded-[28px] shadow-sm border border-gray-100 hover:shadow-md transition-all duration-300 group overflow-hidden relative">
            <div className="flex justify-between items-start mb-4">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110 duration-300" style={{ backgroundColor: `${kpi.color}15`, color: kpi.color }}>
                <kpi.icon size={28} />
              </div>
              <span className="text-xs font-bold py-1 px-3 rounded-full bg-gray-50 text-gray-400">Tempo real</span>
            </div>
            <div>
              <p className="text-gray-400 text-sm font-bold uppercase tracking-wide mb-1">{kpi.label}</p>
              <div className="flex items-end gap-2">
                <p className="text-3xl font-black text-gray-800">{kpi.value}</p>
              </div>
              <p className="text-xs text-gray-400 mt-2 font-medium">{kpi.sub}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-2xl font-black tracking-tight text-gray-800">Atalhos Estratégicos</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            {[
              { id: "admissions", label: "Matrícula", icon: UserPlus, color: "#f06d5e", desc: "Novos registros" },
              { id: "attendance", label: "Frequência", icon: CalendarCheck, color: "#2cb7a5", desc: "Diário de classe" },
              { id: "students", label: "Alunos", icon: Users, color: "#1a2f4e", desc: "Base de dados" },
            ].map((btn) => (
              <button 
                key={btn.id}
                onClick={() => setActiveTab(btn.id)} 
                className="bg-white p-8 rounded-[32px] shadow-sm border border-gray-100 flex flex-col items-start gap-4 hover:border-[#1a2f4e]/30 hover:shadow-xl hover:shadow-[#1a2f4e]/5 transition-all duration-300 group text-left"
              >
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-300 group-hover:rotate-6" style={{ backgroundColor: `${btn.color}15`, color: btn.color }}>
                  <btn.icon size={24} />
                </div>
                <div>
                  <span className="block text-lg font-black text-gray-800">{btn.label}</span>
                  <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">{btn.desc}</span>
                </div>
              </button>
            ))}
          </div>
          
          <div className="bg-white p-8 rounded-[32px] border border-gray-100 shadow-sm overflow-hidden relative">
            <h3 className="text-xl font-black mb-6 flex items-center gap-2">
              <Database size={22} className="text-[#1a2f4e]" />
              Distribuição por Modalidade
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {[
                { label: "Educação Infantil", value: students.filter(s => s.level === 'infantil').length, color: "#2cb7a5" },
                { label: "Ensino Fundamental", value: students.filter(s => s.level === 'fundamental').length, color: "#1a2f4e" },
                { label: "Período Integral", value: students.filter(s => s.modality === 'integral').length, color: "#ef9f2f" },
                { label: "Meio Período", value: students.filter(s => s.modality === 'meio-periodo').length, color: "#f06d5e" },
              ].map((item, idx) => (
                <div key={idx} className="relative pt-2">
                  <span className="block text-[10px] font-black uppercase text-gray-400 tracking-wider mb-1">{item.label}</span>
                  <span className="text-3xl font-black" style={{ color: item.color }}>{item.value}</span>
                  <div className="w-full h-1 bg-gray-50 rounded-full mt-2 overflow-hidden">
                    <div className="h-full rounded-full" style={{ backgroundColor: item.color, width: students.length > 0 ? `${(item.value / students.length) * 100}%` : '0%' }}></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <h3 className="text-2xl font-black tracking-tight text-gray-800">Próximas Reuniões</h3>
          <div className="bg-white p-8 rounded-[32px] shadow-sm border border-gray-100 overflow-hidden relative">
            <div className="absolute -right-8 -top-8 w-32 h-32 bg-[#1a2f4e]/5 rounded-full blur-2xl"></div>
            {meetings.length > 0 ? (
              <div className="space-y-4">
                {meetings.slice(0, 2).map((meeting, idx) => (
                  <div key={idx} className="flex items-center gap-4 p-4 bg-gray-50/50 rounded-2xl border border-gray-100">
                    <div className="w-12 h-12 bg-white rounded-xl flex flex-col items-center justify-center text-[8px] font-black shadow-sm border border-gray-100 shrink-0">
                      <span className="text-[#f06d5e] tracking-widest">{meeting.month}</span>
                      <span className="text-base -mt-1 text-[#0e1a2b]">{meeting.day}</span>
                    </div>
                    <div className="min-w-0">
                      <p className="font-black text-[#0e1a2b] text-sm truncate">{meeting.title}</p>
                      <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">{meeting.time} • {meeting.responsible}</p>
                    </div>
                  </div>
                ))}
                <button 
                  className="w-full py-4 bg-[#1a2f4e]/5 text-[#1a2f4e] font-black text-sm rounded-[20px] hover:bg-[#1a2f4e] hover:text-white transition-all mt-2" 
                  onClick={() => setActiveTab("meetings")}
                >
                  Ver Calendário Completo
                </button>
              </div>
            ) : (
              <div className="py-6 text-center">
                <p className="text-sm text-gray-400 font-bold mb-4 uppercase tracking-widest">Sem reuniões agendadas</p>
                <button 
                  className="w-full py-5 bg-[#1a2f4e] text-white font-black text-lg rounded-[24px] hover:scale-[1.02] active:scale-[0.98] transition-all shadow-xl shadow-[#1a2f4e]/20" 
                  onClick={() => setActiveTab("meetings")}
                >
                  Agendar Agora
                </button>
              </div>
            )}
          </div>
          
          <div className="bg-[#0e1a2b] p-8 rounded-[32px] text-white shadow-xl shadow-[#0e1a2b]/20 relative overflow-hidden">
            <div className="absolute right-0 bottom-0 opacity-10">
              <LayoutDashboard size={120} />
            </div>
            <h4 className="font-black text-xl mb-2">Dica do Sistema</h4>
            <p className="text-white/70 text-sm font-medium leading-relaxed">
              Mantenha o estoque de materiais sempre atualizado para evitar interrupções nas atividades pedagógicas.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function StudentsModule({ students, onSave }: { students: Student[], onSave: (s: Student[]) => void }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [isViewing, setIsViewing] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  
  const filtered = students.filter(s => 
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    s.classroom.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleAddStudent = (newStudent: Omit<Student, 'id'>) => {
    const studentWithId = { ...newStudent, id: Date.now() };
    onSave([...students, studentWithId]);
    setIsAdding(false);
    toast.success("Aluno cadastrado com sucesso!");
  };

  if (isAdding) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <button onClick={() => setIsAdding(false)} className="p-2 hover:bg-gray-100 rounded-lg">
            <X size={20} />
          </button>
          <h2 className="text-2xl font-bold">Novo Aluno</h2>
        </div>
        <AdmissionsModule students={students} onAddStudent={handleAddStudent} />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-6 duration-700">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h2 className="text-3xl font-black text-[#0e1a2b] tracking-tight">Gestão de Alunos</h2>
          <p className="text-gray-400 font-bold text-sm uppercase tracking-widest mt-1">Base de dados unificada</p>
        </div>
        <div className="flex items-center gap-4 w-full md:w-auto">
          <div className="relative flex-1 md:w-[400px]">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-300" size={20} />
            <input 
              type="text" 
              placeholder="Pesquisar por nome ou turma..." 
              className="w-full bg-white border border-gray-100 rounded-[24px] pl-14 pr-6 py-4 text-[15px] focus:ring-4 focus:ring-[#1a2f4e]/10 outline-none shadow-sm transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button 
            onClick={() => setIsAdding(true)}
            className="whitespace-nowrap bg-[#1a2f4e] text-white px-8 py-4 rounded-[24px] font-black text-[15px] hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center gap-3 shadow-xl shadow-[#1a2f4e]/20"
          >
            <UserPlus size={20} />
            Novo Aluno
          </button>
        </div>
      </div>

      <div className="bg-white rounded-[32px] shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="px-8 py-6 text-[11px] font-black text-gray-400 uppercase tracking-[0.2em]">Aluno</th>
                <th className="px-8 py-6 text-[11px] font-black text-gray-400 uppercase tracking-[0.2em]">Turma</th>
                <th className="px-8 py-6 text-[11px] font-black text-gray-400 uppercase tracking-[0.2em]">Responsável</th>
                <th className="px-8 py-6 text-[11px] font-black text-gray-400 uppercase tracking-[0.2em]">Status Docs</th>
                <th className="px-8 py-6 text-[11px] font-black text-gray-400 uppercase tracking-[0.2em] text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map((student) => (
                <tr key={student.id} className="hover:bg-gray-50/50 transition-colors group">
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#1a2f4e]/5 to-[#2a4a7a]/5 flex items-center justify-center text-[#1a2f4e] transition-transform group-hover:scale-110 border border-[#1a2f4e]/10">
                        <Users size={20} className="opacity-40" />
                      </div>
                      <span className="font-black text-[#0e1a2b] text-[15px]">{student.name}</span>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <span className="text-sm font-bold text-gray-500 bg-gray-50 px-3 py-1.5 rounded-xl border border-gray-100">{student.classroom}</span>
                  </td>
                  <td className="px-8 py-6 text-sm font-medium text-gray-400">{student.guardian}</td>
                  <td className="px-8 py-6">
                    <span className={`inline-flex items-center gap-2 px-4 py-2 rounded-2xl text-[11px] font-black uppercase tracking-wider ${student.documentsComplete ? "bg-green-50 text-green-600 ring-1 ring-green-100" : "bg-red-50 text-red-600 ring-1 ring-red-100"}`}>
                      <div className={`w-1.5 h-1.5 rounded-full ${student.documentsComplete ? "bg-green-500" : "bg-red-500"}`}></div>
                      {student.documentsComplete ? "Completo" : "Pendente"}
                    </span>
                  </td>
                  <td className="px-8 py-6 text-right">
                    <button 
                      onClick={() => { setSelectedStudent(student); setIsViewing(true); }}
                      className="inline-flex items-center gap-2 bg-[#1a2f4e]/5 text-[#1a2f4e] px-5 py-2.5 rounded-2xl text-xs font-black hover:bg-[#1a2f4e] hover:text-white transition-all duration-300"
                    >
                      Visualizar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {isViewing && selectedStudent && (
        <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-[25px] w-full max-w-4xl max-h-[90vh] overflow-y-auto p-5 sm:p-8 relative shadow-2xl scale-in-center">
            <button 
              onClick={() => setIsViewing(false)}
              className="absolute right-6 top-6 p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <X size={24} />
            </button>

            <div className="flex flex-col md:flex-row gap-8">
              {/* Profile Sidebar */}
              <div className="md:w-1/3 flex flex-col items-center border-b md:border-b-0 md:border-r border-gray-100 pb-8 md:pb-0 md:pr-8">
                <div className="w-32 h-32 rounded-3xl bg-gradient-to-tr from-[#1a2f4e]/5 to-[#2a4a7a]/5 flex items-center justify-center text-[#1a2f4e] mb-4 shadow-inner border border-[#1a2f4e]/10">
                  <Users size={64} className="opacity-30" />
                </div>
                <h3 className="text-xl font-bold text-center">{selectedStudent.name}</h3>
                <p className="text-gray-500 font-medium">{selectedStudent.classroom}</p>
                <div className="mt-6 w-full space-y-4">
                  <div className="bg-[#f7f8fc] p-4 rounded-2xl">
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-1">Status Financeiro</p>
                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${selectedStudent.financialStatus === 'paid' ? "bg-green-100 text-green-700" : selectedStudent.financialStatus === 'overdue' ? "bg-red-100 text-red-700" : "bg-yellow-100 text-yellow-700"}`}>
                      {selectedStudent.financialStatus === 'paid' ? "Em dia" : selectedStudent.financialStatus === 'overdue' ? "Em atraso" : "Pendente"}
                    </span>
                  </div>
                  <div className="bg-[#f7f8fc] p-4 rounded-2xl">
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-1">Nível de Ensino</p>
                    <p className="font-bold text-sm capitalize">{selectedStudent.level}</p>
                  </div>
                </div>
              </div>

              {/* Data Content */}
              <div className="flex-1 space-y-8">
                <div>
                  <h4 className="text-lg font-bold mb-4 flex items-center gap-2 border-l-4 border-[#1a2f4e] pl-3">Dados Pessoais</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div>
                      <p className="text-xs text-gray-400 font-bold uppercase">Nascimento</p>
                      <p className="font-medium">{selectedStudent.birthDate ? new Date(selectedStudent.birthDate).toLocaleDateString('pt-BR') : 'Não informado'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400 font-bold uppercase">RG/Certidão</p>
                      <p className="font-medium">{selectedStudent.documentNumber || 'Não informado'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400 font-bold uppercase">Responsável</p>
                      <p className="font-medium">{selectedStudent.guardian}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400 font-bold uppercase">Telefone</p>
                      <p className="font-medium">{selectedStudent.phone}</p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-xs text-gray-400 font-bold uppercase">Endereço</p>
                      <p className="font-medium">{selectedStudent.address || 'Não informado'}</p>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="text-lg font-bold mb-4 flex items-center gap-2 border-l-4 border-[#ef9f2f] pl-3">Saúde e Emergência</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div>
                      <p className="text-xs text-gray-400 font-bold uppercase">Contato de Emergência</p>
                      <p className="font-medium">{selectedStudent.emergencyName}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400 font-bold uppercase">Fone Emergência</p>
                      <p className="font-medium">{selectedStudent.emergencyPhone}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400 font-bold uppercase">Histórico Médico</p>
                      <p className="font-medium">{selectedStudent.medical}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400 font-bold uppercase">Alergias</p>
                      <p className="font-medium text-coral-600">{selectedStudent.allergies}</p>
                    </div>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-4">
                    <h4 className="text-lg font-bold flex items-center gap-2 border-l-4 border-[#2cb7a5] pl-3">Documentos Anexados</h4>
                    <div className="flex gap-2">
                      <input 
                        type="file" 
                        id="file-upload" 
                        className="hidden" 
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.onloadend = () => {
                              const newDoc: StudentDocument = {
                                id: Date.now().toString(),
                                name: file.name,
                                type: 'child',
                                fileUrl: reader.result as string,
                                status: 'verified'
                              };
                              const updatedStudents = students.map(s => 
                                s.id === selectedStudent.id 
                                  ? { ...s, documents: [...(s.documents || []), newDoc], documentsComplete: true } 
                                  : s
                              );
                              onSave(updatedStudents);
                              setSelectedStudent({ ...selectedStudent, documents: [...(selectedStudent.documents || []), newDoc], documentsComplete: true });
                              toast.success("Documento anexado com sucesso!");
                            };
                            reader.readAsDataURL(file);
                          }
                        }}
                      />
                      <button 
                        className="text-xs font-bold bg-[#1a2f4e] text-white px-3 py-1.5 rounded-lg flex items-center gap-2 hover:opacity-90"
                        onClick={() => document.getElementById('file-upload')?.click()}
                      >
                        <UserPlus size={14} />
                        Anexar Novo
                      </button>
                    </div>
                  </div>
                  <div className="space-y-3">
                    {selectedStudent.documents && selectedStudent.documents.length > 0 ? (
                      selectedStudent.documents.map(doc => (
                        <div key={doc.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100">
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-white rounded-lg shadow-sm">
                              <FileText size={20} className="text-gray-400" />
                            </div>
                            <div>
                              <p className="text-sm font-bold">{doc.name}</p>
                              <p className="text-[10px] text-gray-400 font-bold uppercase">{doc.type}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${doc.status === 'verified' ? "bg-green-100 text-green-600" : "bg-yellow-100 text-yellow-600"}`}>
                              {doc.status === 'verified' ? 'Verificado' : 'Em Análise'}
                            </span>
                            {doc.fileUrl ? (
                              <button
                                type="button"
                                onClick={() => openDocument(doc.fileUrl!, doc.name)}
                                className="text-[#1a2f4e] text-xs font-bold hover:underline"
                              >
                                Ver arquivo
                              </button>
                            ) : (
                              <button className="text-gray-400 text-xs font-bold cursor-not-allowed">Sem arquivo</button>
                            )}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="p-10 border-2 border-dashed border-gray-100 rounded-2xl flex flex-col items-center justify-center text-gray-400 gap-2">
                        <Folder size={32} />
                        <p className="text-sm font-medium">Nenhum documento anexado ainda.</p>
                      </div>
                    )}
                  </div>
                </div>

                {selectedStudent.pickups && selectedStudent.pickups.length > 0 && (
                  <div>
                    <h4 className="text-lg font-bold mb-4 flex items-center gap-2 border-l-4 border-pink-400 pl-3">Autorizados para Retirada</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {selectedStudent.pickups.map(p => (
                        <div key={p.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-2xl">
                          <div className="w-10 h-10 rounded-full bg-gray-200" />
                          <div>
                            <p className="text-sm font-bold">{p.name}</p>
                            <p className="text-[10px] text-gray-400 font-bold uppercase">{p.relation}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


function EmployeesModule({ employees, onSave }: { employees: Employee[], onSave: (e: Employee[]) => void }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [isViewing, setIsViewing] = useState(false);
  const [formData, setFormData] = useState<Partial<Employee>>({
    name: '',
    role: '',
    cpf: '',
    rg: '',
    pis: '',
    address: '',
    qualifications: '',
    trainingProgress: 0,
    attendance: 100,
    documents: []
  });

  const filtered = employees.filter(e => 
    e.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    e.role.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const newEmp = { ...formData, id: Date.now(), documents: formData.documents || [] } as Employee;
    onSave([...employees, newEmp]);
    setIsAdding(false);
    setFormData({ name: '', role: '', cpf: '', rg: '', pis: '', address: '', qualifications: '', trainingProgress: 0, attendance: 100, documents: [] });
    toast.success("Funcionário cadastrado com sucesso!");
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, empId?: number) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const newDoc: EmployeeDocument = {
          id: Date.now().toString() + Math.random(),
          name: file.name,
          type: 'rg', // Default type
          fileUrl: reader.result as string,
          status: 'verified'
        };

        if (empId) {
          // Updating existing employee
          const updated = employees.map(emp => 
            emp.id === empId ? { ...emp, documents: [...emp.documents, newDoc] } : emp
          );
          onSave(updated);
          if (selectedEmployee?.id === empId) {
            setSelectedEmployee({ ...selectedEmployee, documents: [...selectedEmployee.documents, newDoc] });
          }
        } else {
          // Adding to form state for new employee
          setFormData(prev => ({
            ...prev,
            documents: [...(prev.documents || []), newDoc]
          }));
        }
      };
      reader.readAsDataURL(file);
    });
    toast.success(`${files.length} arquivo(s) anexado(s)`);
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-6 duration-700">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h2 className="text-3xl font-black text-[#0e1a2b] tracking-tight">Equipe Escolar</h2>
          <p className="text-gray-400 font-bold text-sm uppercase tracking-widest mt-1">Corpo Docente e Administrativo</p>
        </div>
        <div className="flex flex-col sm:flex-row items-center gap-4 w-full md:w-auto">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-300" size={20} />
            <input 
              type="text" 
              placeholder="Buscar colaborador..." 
              className="w-full bg-white border border-gray-100 rounded-[24px] pl-14 pr-6 py-4 text-[15px] focus:ring-4 focus:ring-[#1a2f4e]/10 outline-none shadow-sm transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button 
            onClick={() => setIsAdding(!isAdding)}
            className={`whitespace-nowrap ${isAdding ? "bg-gray-100 text-gray-500" : "bg-[#1a2f4e] text-white shadow-xl shadow-[#1a2f4e]/20"} px-8 py-4 rounded-[24px] font-black text-[15px] hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center gap-3`}
          >
            {isAdding ? <X size={20} /> : <UserPlus size={20} />}
            {isAdding ? "Cancelar" : "Novo Colaborador"}
          </button>
        </div>
      </div>

      {isAdding && (
        <div className="bg-white p-10 rounded-[40px] shadow-sm border border-gray-100 animate-in fade-in zoom-in-95 duration-300">
          <form onSubmit={handleSave} className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="space-y-3">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Nome Completo</label>
                <input required type="text" className="w-full p-4 rounded-[20px] border border-gray-100 bg-gray-50/50 outline-none focus:ring-4 focus:ring-[#1a2f4e]/10 transition-all text-[15px]" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
              </div>
              <div className="space-y-3">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Cargo</label>
                <input required type="text" className="w-full p-4 rounded-[20px] border border-gray-100 bg-gray-50/50 outline-none focus:ring-4 focus:ring-[#1a2f4e]/10 transition-all text-[15px]" value={formData.role} onChange={e => setFormData({...formData, role: e.target.value})} />
              </div>
              <div className="space-y-3">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">CPF</label>
                <input required type="text" className="w-full p-4 rounded-[20px] border border-gray-100 bg-gray-50/50 outline-none focus:ring-4 focus:ring-[#1a2f4e]/10 transition-all text-[15px]" value={formData.cpf} onChange={e => setFormData({...formData, cpf: e.target.value})} />
              </div>
              <div className="space-y-3">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">RG</label>
                <input required type="text" className="w-full p-4 rounded-[20px] border border-gray-100 bg-gray-50/50 outline-none focus:ring-4 focus:ring-[#1a2f4e]/10 transition-all text-[15px]" value={formData.rg} onChange={e => setFormData({...formData, rg: e.target.value})} />
              </div>
              <div className="space-y-3">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">PIS</label>
                <input required type="text" className="w-full p-4 rounded-[20px] border border-gray-100 bg-gray-50/50 outline-none focus:ring-4 focus:ring-[#1a2f4e]/10 transition-all text-[15px]" value={formData.pis} onChange={e => setFormData({...formData, pis: e.target.value})} />
              </div>
              <div className="space-y-3">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Qualificações</label>
                <input required type="text" className="w-full p-4 rounded-[20px] border border-gray-100 bg-gray-50/50 outline-none focus:ring-4 focus:ring-[#1a2f4e]/10 transition-all text-[15px]" value={formData.qualifications} onChange={e => setFormData({...formData, qualifications: e.target.value})} />
              </div>
              <div className="md:col-span-3 space-y-3">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Endereço Completo</label>
                <input required type="text" className="w-full p-4 rounded-[20px] border border-gray-100 bg-gray-50/50 outline-none focus:ring-4 focus:ring-[#1a2f4e]/10 transition-all text-[15px]" value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} />
              </div>
            </div>

            <div className="space-y-4">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Documentos e Certificados</label>
              <div className="flex flex-wrap gap-4">
                <label className="cursor-pointer bg-[#1a2f4e]/5 text-[#1a2f4e] px-8 py-5 rounded-[24px] font-black text-[15px] hover:bg-[#1a2f4e] hover:text-white transition-all flex items-center gap-3 border border-[#1a2f4e]/10">
                  <Folder size={20} />
                  Anexar Arquivos
                  <input type="file" multiple className="hidden" onChange={e => handleFileUpload(e)} />
                </label>
                {formData.documents && formData.documents.length > 0 && (
                  <div className="flex gap-3 items-center text-xs font-black text-green-600 bg-green-50 px-6 py-4 rounded-[24px] ring-1 ring-green-100">
                    <CheckCircle size={18} />
                    {formData.documents.length} ARQUIVO(S) SELECIONADO(S)
                  </div>
                )}
              </div>
            </div>

            <button type="submit" className="w-full py-5 bg-[#2cb7a5] text-white font-black rounded-[24px] hover:scale-[1.01] active:scale-[0.99] transition-all shadow-xl shadow-[#2cb7a5]/20">
              Finalizar Cadastro
            </button>
          </form>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {filtered.map((emp) => (
          <div key={emp.id} className="bg-white p-8 rounded-[32px] shadow-sm border border-gray-100 flex items-start gap-6 group hover:shadow-xl hover:shadow-[#1a2f4e]/5 transition-all duration-300">
            <div className="w-16 h-16 rounded-[24px] bg-gradient-to-tr from-[#1a2f4e]/10 to-[#ef9f2f]/10 flex items-center justify-center text-[#1a2f4e] shrink-0 ring-1 ring-[#1a2f4e]/5 transition-transform group-hover:scale-110">
              <Briefcase size={28} />
            </div>
            <div className="flex-1">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h4 className="font-black text-[#0e1a2b] text-lg leading-tight">{emp.name}</h4>
                  <span className="inline-block mt-2 px-3 py-1 bg-[#1a2f4e]/5 text-[#1a2f4e] text-[10px] font-black uppercase tracking-widest rounded-xl ring-1 ring-[#1a2f4e]/10">
                    {emp.role}
                  </span>
                </div>
                <button 
                  onClick={() => { setSelectedEmployee(emp); setIsViewing(true); }}
                  className="px-4 py-2 text-[#1a2f4e] text-[11px] font-black uppercase tracking-widest border border-[#1a2f4e]/10 rounded-[15px] hover:bg-[#1a2f4e] hover:text-white transition-all duration-300"
                >
                  Visualizar
                </button>
              </div>
              
              <div className="bg-gray-50/50 p-4 rounded-[20px] mb-6 border border-gray-100/50">
                <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mb-1">Qualificações</p>
                <p className="text-xs text-gray-500 font-medium line-clamp-1 italic">{emp.qualifications}</p>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <div className="flex justify-between items-end">
                    <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Treinamento</span>
                    <span className="text-xs font-black text-[#1a2f4e]">{emp.trainingProgress}%</span>
                  </div>
                  <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden shadow-inner">
                    <div className="bg-gradient-to-r from-[#1a2f4e] to-[#2a4a7a] h-full rounded-full transition-all duration-1000" style={{ width: `${emp.trainingProgress}%` }} />
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between items-end">
                    <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Presença</span>
                    <span className="text-xs font-black text-[#2cb7a5]">{emp.attendance}%</span>
                  </div>
                  <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden shadow-inner">
                    <div className="bg-gradient-to-r from-[#2cb7a5] to-[#45d1c1] h-full rounded-full transition-all duration-1000" style={{ width: `${emp.attendance}%` }} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {isViewing && selectedEmployee && (
        <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-[40px] w-full max-w-3xl max-h-[90vh] overflow-y-auto p-6 sm:p-10 relative shadow-2xl animate-in fade-in zoom-in-95 duration-300">
            <button onClick={() => setIsViewing(false)} className="absolute right-8 top-8 p-2 hover:bg-gray-100 rounded-full transition-colors">
              <X size={24} />
            </button>
            
            <div className="flex gap-8 mb-10 border-b border-gray-100 pb-8">
              <div className="w-24 h-24 rounded-[32px] bg-gradient-to-tr from-[#1a2f4e]/10 to-[#ef9f2f]/10 flex items-center justify-center text-[#1a2f4e] ring-1 ring-[#1a2f4e]/5">
                <Briefcase size={40} />
              </div>
              <div>
                <h3 className="text-3xl font-black text-[#0e1a2b] tracking-tight">{selectedEmployee.name}</h3>
                <span className="inline-block mt-2 px-4 py-1.5 bg-[#1a2f4e]/5 text-[#1a2f4e] text-[11px] font-black uppercase tracking-widest rounded-2xl ring-1 ring-[#1a2f4e]/10">
                  {selectedEmployee.role}
                </span>
                <div className="flex gap-6 mt-4">
                   <div className="flex flex-col">
                     <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Documento CPF</span>
                     <span className="text-sm font-bold text-gray-600">{selectedEmployee.cpf}</span>
                   </div>
                   <div className="flex flex-col">
                     <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Documento RG</span>
                     <span className="text-sm font-bold text-gray-600">{selectedEmployee.rg}</span>
                   </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-10 mb-8">
              <div className="space-y-6">
                <h4 className="font-black text-[#0e1a2b] text-sm uppercase tracking-[0.2em] flex items-center gap-3">
                  <div className="w-1.5 h-6 bg-[#1a2f4e] rounded-full" /> Dados Profissionais
                </h4>
                <div className="space-y-5 bg-gray-50/50 p-6 rounded-[32px] border border-gray-100/50">
                  <div>
                    <p className="text-[9px] text-gray-400 font-black uppercase tracking-widest mb-1">Qualificações Acadêmicas</p>
                    <p className="text-[15px] font-bold text-gray-700 leading-relaxed italic">"{selectedEmployee.qualifications}"</p>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2">
                    <div>
                      <p className="text-[9px] text-gray-400 font-black uppercase tracking-widest mb-1">PIS/PASEP</p>
                      <p className="text-sm font-bold text-gray-700">{selectedEmployee.pis}</p>
                    </div>
                  </div>
                  <div className="pt-2">
                    <p className="text-[9px] text-gray-400 font-black uppercase tracking-widest mb-1">Endereço Residencial</p>
                    <p className="text-sm font-bold text-gray-700">{selectedEmployee.address}</p>
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <h4 className="font-black text-[#2cb7a5] text-sm uppercase tracking-[0.2em] flex items-center gap-3">
                    <div className="w-1.5 h-6 bg-[#2cb7a5] rounded-full" /> Documentação
                  </h4>
                  <label className="cursor-pointer bg-[#2cb7a5]/5 text-[#2cb7a5] px-4 py-2 rounded-[15px] text-[11px] font-black uppercase tracking-widest hover:bg-[#2cb7a5] hover:text-white transition-all ring-1 ring-[#2cb7a5]/10">
                    Anexar
                    <input type="file" multiple className="hidden" onChange={e => handleFileUpload(e, selectedEmployee.id)} />
                  </label>
                </div>
                <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                  {selectedEmployee.documents && selectedEmployee.documents.length > 0 ? (
                    selectedEmployee.documents.map(doc => (
                      <div key={doc.id} className="flex items-center justify-between p-4 bg-white rounded-[20px] border border-gray-100 shadow-sm hover:shadow-md transition-shadow group">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center text-gray-400 group-hover:bg-[#1a2f4e]/5 group-hover:text-[#1a2f4e] transition-colors">
                            <FileText size={20} />
                          </div>
                          <span className="text-sm font-black text-[#0e1a2b] truncate max-w-[150px]">{doc.name}</span>
                        </div>
                        {doc.fileUrl && (
                          <button type="button" onClick={() => openDocument(doc.fileUrl!, doc.name)} className="px-4 py-2 bg-gray-50 text-[#1a2f4e] text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-[#1a2f4e] hover:text-white transition-all">
                            Visualizar
                          </button>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="p-10 border-2 border-dashed border-gray-100 rounded-[32px] flex flex-col items-center justify-center text-gray-300">
                      <Folder size={32} className="mb-3 opacity-20" />
                      <p className="text-[11px] font-black uppercase tracking-widest">Nenhum arquivo</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function AttendanceModule({ 
  students, 
  attendanceRecords, 
  onSaveAttendance 
}: { 
  students: Student[], 
  attendanceRecords: AttendanceRecord[], 
  onSaveAttendance: (newRecords: AttendanceRecord[]) => void 
}) {
  const [activeSubTab, setActiveSubTab] = useState<'register' | 'query'>('register');
  const [filterClassroom, setFilterClassroom] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStudentId, setSelectedStudentId] = useState<number | null>(null);

  const classrooms = Array.from(new Set(students.map(s => s.classroom)));
  
  const filteredStudents = students.filter(s => {
    const matchClass = filterClassroom === "" || s.classroom === filterClassroom;
    const matchName = s.name.toLowerCase().includes(searchTerm.toLowerCase());
    return matchClass && matchName;
  });

  const handleToggleAttendance = (studentId: number) => {
    const today = new Date().toISOString().split('T')[0] || '';
    const existing = attendanceRecords.find(r => r.date === today && r.studentId === studentId);
    
    if (existing) {
      onSaveAttendance(attendanceRecords.filter(r => r.id !== existing.id));
      toast.info("Registro removido");
    } else {
      const newRecord: AttendanceRecord = {
        id: Date.now().toString(),
        date: today,
        studentId,
        status: 'absent'
      };
      onSaveAttendance([...attendanceRecords, newRecord]);
      toast.success("Falta registrada");
    }
  };

  const handleExportPDF = () => {
    const doc = new jsPDF();
    const today = new Date().toLocaleDateString('pt-BR');
    
    doc.setFontSize(18);
    doc.text(`Relatório de Frequência - ${today}`, 14, 20);
    
    const tableData = filteredStudents.map(s => {
      const isAbsent = attendanceRecords.some(r => r.date === new Date().toISOString().split('T')[0] && r.studentId === s.id);
      return [
        s.name,
        s.classroom,
        isAbsent ? 'Ausente' : 'Presente'
      ];
    });

    autoTable(doc, {
      startY: 30,
      head: [['Aluno', 'Turma', 'Status']],
      body: tableData,
      headStyles: { fillColor: [103, 80, 164] }, // EduGestão Purple
    });

    doc.save(`frequencia_${new Date().toISOString().split('T')[0]}.pdf`);
    toast.success("PDF gerado com sucesso!");
  };

  const studentAbsences = selectedStudentId 
    ? attendanceRecords.filter(r => r.studentId === selectedStudentId && r.status === 'absent') 
    : [];

  const selectedStudent = students.find(s => s.id === selectedStudentId);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-6 duration-700">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h2 className="text-3xl font-black text-[#0e1a2b] tracking-tight">Frequência Escolar</h2>
          <p className="text-gray-400 font-bold text-sm uppercase tracking-widest mt-1">Controle de Presença Diária</p>
        </div>
        <div className="flex bg-white p-1.5 rounded-[24px] border border-gray-100 shadow-sm">
          <button 
            onClick={() => setActiveSubTab('register')}
            className={`px-8 py-3 rounded-[20px] text-[13px] font-black transition-all duration-300 ${activeSubTab === 'register' ? "bg-[#1a2f4e] text-white shadow-lg shadow-[#1a2f4e]/20" : "text-gray-400 hover:text-[#1a2f4e]"}`}
          >
            Fazer Chamada
          </button>
          <button 
            onClick={() => setActiveSubTab('query')}
            className={`px-8 py-3 rounded-[20px] text-[13px] font-black transition-all duration-300 ${activeSubTab === 'query' ? "bg-[#1a2f4e] text-white shadow-lg shadow-[#1a2f4e]/20" : "text-gray-400 hover:text-[#1a2f4e]"}`}
          >
            Consultar Histórico
          </button>
        </div>
      </div>

      {activeSubTab === 'register' ? (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-[20px] shadow-sm border border-gray-100 flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Turma</label>
              <select 
                className="w-full bg-[#f7f8fc] border border-gray-100 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-[#1a2f4e] outline-none"
                value={filterClassroom}
                onChange={e => setFilterClassroom(e.target.value)}
              >
                <option value="">Todas as Turmas</option>
                {classrooms.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="flex-1">
              <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Buscar Aluno</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input 
                  type="text" 
                  placeholder="Nome do aluno..." 
                  className="w-full bg-[#f7f8fc] border border-gray-100 rounded-xl pl-10 pr-4 py-3 text-sm focus:ring-2 focus:ring-[#1a2f4e] outline-none"
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
            <div className="flex-1">
              <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Data</label>
              <div className="bg-[#f7f8fc] border border-gray-100 px-6 py-3 rounded-xl text-sm font-bold text-[#1a2f4e] flex items-center gap-2">
                <CalendarCheck size={18} />
                {new Date().toLocaleDateString('pt-BR')}
              </div>
            </div>
            <div className="flex items-end">
               <button 
                 onClick={() => {
                   const today = new Date().toISOString().split('T')[0];
                   const currentAbsences = attendanceRecords.filter(r => r.date === today);
                   const idsToKeep = attendanceRecords.filter(r => r.date !== today).map(r => r.id);
                   // Basically clear all absences for today
                   onSaveAttendance(attendanceRecords.filter(r => r.date !== today));
                   toast.success("Todos os alunos marcados como presentes!");
                 }}
                 className="bg-[#1a2f4e]/5 px-6 py-3 rounded-xl border border-[#1a2f4e]/10 text-sm font-bold text-[#1a2f4e] flex items-center gap-2 hover:bg-[#1a2f4e]/10 transition-colors"
               >
                 <Users size={18} />
                 Marcar todos como presentes
               </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white p-6 rounded-[20px] shadow-sm border border-gray-100 flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-[#1a2f4e]/10 flex items-center justify-center text-[#1a2f4e]">
                <Users size={24} />
              </div>
              <div>
                <p className="text-2xl font-bold">{filteredStudents.length}</p>
                <p className="text-xs text-gray-400 font-bold uppercase">alunos</p>
              </div>
            </div>
            <div className="bg-white p-6 rounded-[20px] shadow-sm border border-gray-100 flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-green-100 flex items-center justify-center text-green-600">
                <CalendarCheck size={24} />
              </div>
              <div>
                <p className="text-2xl font-bold text-green-600">
                  {filteredStudents.length - attendanceRecords.filter(r => r.date === new Date().toISOString().split('T')[0]).length}
                </p>
                <p className="text-xs text-gray-400 font-bold uppercase">presentes</p>
              </div>
            </div>
            <div className="bg-white p-6 rounded-[20px] shadow-sm border border-gray-100 flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-red-100 flex items-center justify-center text-red-600">
                <X size={24} />
              </div>
              <div>
                <p className="text-2xl font-bold text-red-600">
                  {attendanceRecords.filter(r => r.date === new Date().toISOString().split('T')[0]).length}
                </p>
                <p className="text-xs text-gray-400 font-bold uppercase">ausentes</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-[25px] p-8 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h3 className="font-bold text-lg">Chamada do Dia</h3>
                <p className="text-gray-400 text-sm">Registro de presença dos alunos.</p>
              </div>
              <div className="flex gap-2">
                <span className="text-xs bg-green-100 text-green-700 px-3 py-1 rounded-full font-bold">
                  {filteredStudents.length - attendanceRecords.filter(r => r.date === new Date().toISOString().split('T')[0]).length} Presentes
                </span>
                <span className="text-xs bg-red-100 text-red-700 px-3 py-1 rounded-full font-bold">
                  {attendanceRecords.filter(r => r.date === new Date().toISOString().split('T')[0]).length} Ausentes
                </span>
              </div>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-400 border-b border-gray-100">
                    <th className="pb-4">Aluno</th>
                    <th className="pb-4">Turma</th>
                    <th className="pb-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filteredStudents.map(s => {
                    const isAbsent = attendanceRecords.some(r => r.date === new Date().toISOString().split('T')[0] && r.studentId === s.id);
                    return (
                      <tr key={s.id} className="group hover:bg-[#f7f8fc]">
                        <td className="py-4 flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-[#1a2f4e]/5 to-[#2a4a7a]/5 flex items-center justify-center text-[#1a2f4e] border border-[#1a2f4e]/10">
                            <Users size={16} className="opacity-40" />
                          </div>
                          <span className="font-medium">{s.name}</span>
                        </td>
                        <td className="py-4 text-gray-500">{s.classroom}</td>
                        <td className="py-4">
                          <div className="flex items-center gap-2">
                            <button 
                              onClick={() => {
                                const today = new Date().toISOString().split('T')[0];
                                const isAbsent = attendanceRecords.some(r => r.date === today && r.studentId === s.id);
                                if (isAbsent) handleToggleAttendance(s.id);
                              }}
                              className={`px-3 py-1.5 rounded-lg border text-[10px] font-bold uppercase transition-all flex items-center gap-1.5 ${!isAbsent ? "border-green-200 bg-green-50 text-green-700 shadow-sm" : "border-gray-200 text-gray-400 hover:bg-gray-100"}`}
                            >
                              <div className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${!isAbsent ? "bg-green-500 border-green-500 text-white" : "border-gray-300"}`}>
                                {!isAbsent && <span className="text-[8px]">✓</span>}
                              </div>
                              Presente
                            </button>
                            <button 
                              onClick={() => {
                                const today = new Date().toISOString().split('T')[0];
                                const isAbsent = attendanceRecords.some(r => r.date === today && r.studentId === s.id);
                                if (!isAbsent) handleToggleAttendance(s.id);
                              }}
                              className={`px-3 py-1.5 rounded-lg border text-[10px] font-bold uppercase transition-all flex items-center gap-1.5 ${isAbsent ? "border-red-200 bg-red-50 text-red-700 shadow-sm" : "border-gray-200 text-gray-400 hover:bg-gray-100"}`}
                            >
                              <div className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${isAbsent ? "bg-red-500 border-red-500 text-white" : "border-gray-300"}`}>
                                {isAbsent && <X size={8} strokeWidth={4} />}
                              </div>
                              Ausente
                            </button>
                          </div>
                        </td>
                        <td className="py-4 text-right">
                          <button className="text-gray-400 hover:text-gray-600 transition-colors">
                            <Menu size={16} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            
            <div className="mt-10 pt-6 border-t border-gray-100 flex flex-col md:flex-row items-center justify-between gap-4">
               <div className="flex items-center gap-6 text-sm">
                 <span className="text-gray-400">Resumo do dia:</span>
                 <div className="flex items-center gap-2 font-bold text-green-600">
                   <div className="w-5 h-5 rounded-full bg-green-500 text-white flex items-center justify-center text-[10px]">✓</div>
                   Presentes: {filteredStudents.length - attendanceRecords.filter(r => r.date === new Date().toISOString().split('T')[0]).length}
                 </div>
                 <div className="flex items-center gap-2 font-bold text-red-600">
                   <div className="w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center text-[10px]">×</div>
                   Ausentes: {attendanceRecords.filter(r => r.date === new Date().toISOString().split('T')[0]).length}
                 </div>
               </div>
               <button 
                className="px-8 py-4 bg-[#1a2f4e] text-white font-bold rounded-[20px] hover:bg-[#55409b] transition-all shadow-lg shadow-[#1a2f4e]/20 flex items-center gap-2"
                onClick={handleExportPDF}
               >
                <FileText size={20} />
                Finalizar e Gerar PDF da Chamada
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          {/* Query Filters */}
          <div className="space-y-6">
            <div className="bg-white p-8 rounded-[25px] shadow-sm border border-gray-100 space-y-6">
              <h3 className="font-bold text-lg border-l-4 border-[#1a2f4e] pl-3">Consulta de Faltas</h3>
              
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500 uppercase">1. Selecione a Turma</label>
                <select 
                  className="w-full bg-[#f7f8fc] border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-[#1a2f4e] outline-none"
                  value={filterClassroom}
                  onChange={e => {
                    setFilterClassroom(e.target.value);
                    setSelectedStudentId(null);
                    setSearchTerm("");
                  }}
                >
                  <option value="">Selecione a turma...</option>
                  {classrooms.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              {filterClassroom && (
                <div className="space-y-4 animate-in fade-in duration-300">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-500 uppercase">2. Selecione o Aluno</label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                      <input 
                        type="text" 
                        placeholder="Filtrar alunos da turma..." 
                        className="w-full bg-[#f7f8fc] border-none rounded-xl pl-10 pr-4 py-3 text-sm focus:ring-2 focus:ring-[#1a2f4e] outline-none"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="max-h-64 overflow-y-auto space-y-2 pr-2">
                    {filteredStudents.length > 0 ? filteredStudents.map(s => (
                      <button 
                        key={s.id}
                        onClick={() => setSelectedStudentId(s.id)}
                        className={`w-full text-left p-3 rounded-xl transition-all border ${selectedStudentId === s.id ? 'bg-[#1a2f4e] text-white border-[#1a2f4e]' : 'bg-white text-gray-600 border-gray-100 hover:border-[#1a2f4e]'}`}
                      >
                        <p className="text-sm font-bold">{s.name}</p>
                      </button>
                    )) : (
                      <p className="text-center text-xs text-gray-400 py-4 italic">Nenhum aluno nesta turma.</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Results Area */}
          <div className="lg:col-span-2">
            {selectedStudentId ? (
              <div className="bg-white rounded-[25px] shadow-sm border border-gray-100 overflow-hidden animate-in fade-in slide-in-from-right-4 duration-500">
                <div className="bg-[#1a2f4e] p-8 text-white relative">
                  <div className="relative z-10">
                    <div className="flex items-center gap-4 mb-4">
                       <div className="w-16 h-16 rounded-2xl bg-white/20 flex items-center justify-center text-white text-2xl font-bold backdrop-blur-sm">
                        {selectedStudent?.name.charAt(0)}
                       </div>
                       <div>
                         <h3 className="text-2xl font-bold">{selectedStudent?.name}</h3>
                         <p className="text-white/70 font-medium">{selectedStudent?.classroom}</p>
                       </div>
                    </div>
                    <div className="flex gap-4">
                      <div className="bg-white/10 px-4 py-2 rounded-xl backdrop-blur-sm border border-white/20">
                        <p className="text-[10px] uppercase font-bold text-white/60">Total de Faltas</p>
                        <p className="text-xl font-bold">{studentAbsences.length}</p>
                      </div>
                      <div className="bg-white/10 px-4 py-2 rounded-xl backdrop-blur-sm border border-white/20">
                        <p className="text-[10px] uppercase font-bold text-white/60">Frequência</p>
                        <p className="text-xl font-bold">{Math.max(0, 100 - (studentAbsences.length * 2))}%</p>
                      </div>
                    </div>
                  </div>
                  <div className="absolute top-0 right-0 p-20 opacity-10 pointer-events-none">
                    <Users size={200} />
                  </div>
                </div>

                <div className="p-8">
                  <h4 className="font-bold text-gray-700 mb-6 flex items-center gap-2">
                    <Clock size={20} className="text-[#1a2f4e]" />
                    Histórico de Ausências
                  </h4>

                  {studentAbsences.length > 0 ? (
                    <div className="space-y-4">
                      {studentAbsences.map(r => (
                        <div key={r.id} className="flex items-center justify-between p-6 bg-gray-50/50 rounded-[24px] border border-gray-100/50 group hover:bg-white hover:shadow-xl hover:shadow-red-500/5 transition-all duration-300">
                           <div className="flex items-center gap-5">
                              <div className="w-12 h-12 rounded-2xl bg-red-50 flex flex-col items-center justify-center text-red-500 font-black shadow-sm ring-1 ring-red-100 transition-transform group-hover:scale-105">
                                <span className="text-xs uppercase tracking-tighter opacity-60 leading-none">{new Date(r.date + 'T00:00:00').toLocaleDateString('pt-BR', { month: 'short' }).substring(0,3).toUpperCase()}</span>
                                <span className="text-xl leading-none">{new Date(r.date + 'T00:00:00').getDate()}</span>
                              </div>
                              <div>
                                <p className="font-black text-[#0e1a2b] text-[15px] capitalize">{new Date(r.date + 'T00:00:00').toLocaleDateString('pt-BR', { weekday: 'long' })}</p>
                                <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mt-0.5">{new Date(r.date + 'T00:00:00').toLocaleDateString('pt-BR')}</p>
                              </div>
                           </div>
                           <span className="px-4 py-2 bg-red-50 text-red-600 text-[10px] font-black uppercase tracking-wider rounded-2xl ring-1 ring-red-100">
                             Ausente
                           </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-16 bg-green-50 rounded-3xl border border-green-100">
                      <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4 text-green-500 shadow-sm">
                        <CalendarCheck size={32} />
                      </div>
                      <p className="font-bold text-green-700">Aluno exemplar!</p>
                      <p className="text-sm text-green-600">Nenhuma ausência registrada no sistema.</p>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-[40px] border border-gray-100 p-24 flex flex-col items-center justify-center text-gray-300">
                <Search size={80} className="mb-6 opacity-20" />
                <p className="font-black text-[#0e1a2b] text-xl text-center">Aguardando Consulta</p>
                <p className="text-sm font-bold text-gray-400 text-center mt-2 max-w-xs leading-relaxed uppercase tracking-widest">Selecione uma turma e um aluno à esquerda para ver os detalhes.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function AdmissionsModule({ students, onAddStudent }: { students: Student[], onAddStudent: (s: Omit<Student, 'id'>) => void }) {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState<Partial<Student>>({
    name: '',
    birthDate: '',
    documentNumber: '',
    parentage: '',
    address: '',
    classroom: 'Turma A',
    guardian: '',
    phone: '',
    emergencyName: '',
    emergencyPhone: '',
    medical: 'Nenhum',
    allergies: 'Nenhuma',
    modality: 'integral',
    level: 'fundamental',
    financialStatus: 'pending',
    academicStatus: 'progression',
    documentsComplete: false
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Simulate processing attached documents
    const updatedDocuments: StudentDocument[] = [
      { id: '101', name: 'RG Aluno', type: 'child', status: 'verified' },
      { id: '102', name: 'CPF Responsável', type: 'guardian', status: 'verified' }
    ];

    const studentToSave = { 
      ...formData, 
      documents: updatedDocuments,
      documentsComplete: true 
    };

    onAddStudent(studentToSave as Omit<Student, 'id'>);
    toast.success("Matrícula realizada com sucesso!");
    setStep(1);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Processo de Matrícula</h2>
        <div className="flex gap-2">
          {[1, 2, 3].map(i => (
            <div key={i} className={`w-10 h-10 rounded-full flex items-center justify-center font-bold transition-colors ${step === i ? "bg-[#1a2f4e] text-white" : "bg-gray-100 text-gray-400"}`}>
              {i}
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white p-8 rounded-[20px] shadow-sm border border-gray-100">
        <form onSubmit={handleSubmit} className="space-y-6">
          {step === 1 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 scale-in-center">
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-600">Nome Completo</label>
                <input required type="text" className="w-full p-3 rounded-xl border border-gray-100 bg-[#f7f8fc] outline-none focus:ring-2 focus:ring-[#1a2f4e]" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-600">Data de Nascimento</label>
                <input required type="date" className="w-full p-3 rounded-xl border border-gray-100 bg-[#f7f8fc] outline-none focus:ring-2 focus:ring-[#1a2f4e]" value={formData.birthDate} onChange={e => setFormData({...formData, birthDate: e.target.value})} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-600">RG ou Certidão</label>
                <input required type="text" className="w-full p-3 rounded-xl border border-gray-100 bg-[#f7f8fc] outline-none focus:ring-2 focus:ring-[#1a2f4e]" value={formData.documentNumber} onChange={e => setFormData({...formData, documentNumber: e.target.value})} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-600">Filiação</label>
                <input type="text" className="w-full p-3 rounded-xl border border-gray-100 bg-[#f7f8fc] outline-none focus:ring-2 focus:ring-[#1a2f4e]" value={formData.parentage} onChange={e => setFormData({...formData, parentage: e.target.value})} />
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 scale-in-center">
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-600">Endereço</label>
                <input type="text" className="w-full p-3 rounded-xl border border-gray-100 bg-[#f7f8fc] outline-none focus:ring-2 focus:ring-[#1a2f4e]" value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-600">Telefone do Responsável</label>
                <input type="tel" className="w-full p-3 rounded-xl border border-gray-100 bg-[#f7f8fc] outline-none focus:ring-2 focus:ring-[#1a2f4e]" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-600">Modalidade</label>
                <select className="w-full p-3 rounded-xl border border-gray-100 bg-[#f7f8fc] outline-none focus:ring-2 focus:ring-[#1a2f4e]" value={formData.modality} onChange={e => setFormData({...formData, modality: e.target.value as any})}>
                  <option value="integral">Período Integral</option>
                  <option value="meio-periodo">Meio Período</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-600">Nível Escolar</label>
                <select className="w-full p-3 rounded-xl border border-gray-100 bg-[#f7f8fc] outline-none focus:ring-2 focus:ring-[#1a2f4e]" value={formData.level} onChange={e => setFormData({...formData, level: e.target.value as any})}>
                  <option value="infantil">Educação Infantil</option>
                  <option value="fundamental">Ensino Fundamental</option>
                </select>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6 scale-in-center">
              <label className="p-10 border-2 border-dashed border-[#1a2f4e]/30 rounded-[25px] flex flex-col items-center justify-center text-gray-400 gap-4 bg-[#1a2f4e]/5 hover:bg-[#1a2f4e]/10 transition-colors group cursor-pointer w-full">
                <input 
                  type="file" 
                  className="hidden" 
                  multiple
                  onChange={async (e) => {
                    if (e.target.files && e.target.files.length > 0) {
                      const files = Array.from(e.target.files);
                      const processedFiles = await Promise.all(files.map(file => new Promise<{name: string, url: string}>(resolve => {
                        const reader = new FileReader();
                        reader.onloadend = () => resolve({ name: file.name, url: reader.result as string });
                        reader.readAsDataURL(file);
                      })));
                      // Here we could store these in the form state if we had a full form state object
                      toast.success(`${e.target.files.length} documento(s) anexado(s) e processado(s)`);
                    }
                  }}
                />
                <div className="w-16 h-16 rounded-2xl bg-white shadow-sm flex items-center justify-center text-[#1a2f4e] group-hover:scale-110 transition-transform">
                  <Folder size={32} />
                </div>
                <div className="text-center">
                  <p className="font-bold text-[#1a2f4e]">Clique ou arraste para anexar documentos</p>
                  <p className="text-sm text-gray-400 mt-1">Formatos suportados: PDF, JPEG, PNG (Max 5MB)</p>
                </div>
                <div className="flex flex-wrap justify-center gap-3 mt-2">
                  {[
                    { label: 'RG do Aluno', icon: FileText },
                    { label: 'CPF do Responsável', icon: FileText },
                    { label: 'Comprovante Residência', icon: FileText },
                    { label: 'Carteira Vacinação', icon: FileText }
                  ].map((doc, idx) => (
                    <span key={idx} className="bg-white px-4 py-2 rounded-xl text-xs font-bold text-gray-500 shadow-sm flex items-center gap-2 border border-gray-100">
                      <doc.icon size={14} />
                      {doc.label}
                    </span>
                  ))}
                </div>
              </label>
              
              <div className="bg-coral-50 border border-coral-100 p-4 rounded-xl flex gap-3 text-coral-700">
                <AlertCircle size={20} className="shrink-0" />
                <p className="text-sm font-medium">A matrícula só poderá ser finalizada após o upload dos documentos obrigatórios.</p>
              </div>
            </div>
          )}


          <div className="flex justify-between pt-6">
            {step > 1 && <button type="button" onClick={() => setStep(step - 1)} className="px-8 py-3 rounded-xl border border-gray-100 font-bold hover:bg-gray-50 transition-colors">Voltar</button>}
            <div className="flex-1" />
            {step < 3 ? (
              <button type="button" onClick={() => setStep(step + 1)} className="px-8 py-3 bg-[#1a2f4e] text-white rounded-xl font-bold hover:opacity-90 transition-opacity">Próximo</button>
            ) : (
              <button type="submit" className="px-8 py-3 bg-[#2cb7a5] text-white rounded-xl font-bold hover:opacity-90 transition-opacity">Finalizar Matrícula</button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}

function FinancialModule({ students, onSave }: { students: Student[], onSave: (s: Student[]) => void }) {
  const [filter, setFilter] = useState<'all' | 'pending' | 'overdue'>('all');
  const [searchTerm, setSearchTerm] = useState("");
  
  const filtered = students.filter(s => {
    const matchFilter = filter === 'all' || s.financialStatus === filter;
    const matchSearch = s.name.toLowerCase().includes(searchTerm.toLowerCase());
    return matchFilter && matchSearch;
  });

  const handleToggleStatus = (studentId: number) => {
    const student = students.find(s => s.id === studentId);
    if (!student) return;

    const newStatus = student.financialStatus === 'paid' ? 'pending' : 'paid';
    const updated = students.map(s => 
      s.id === studentId ? { ...s, financialStatus: newStatus as any } : s
    );
    onSave(updated);
    toast.success(`Status alterado para ${newStatus === 'paid' ? 'Pago' : 'Pendente'}`);
  };

  const handleWhatsAppMessage = (student: Student) => {
    const message = `Olá ${student.guardian}, informamos que a mensalidade do aluno(a) ${student.name} referente a este mês está pendente. Por favor, regularize o quanto antes.`;
    const phone = (student.phone || "11977461938").replace(/\D/g, '');
    const url = `https://wa.me/55${phone}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };

  const handleEmailMessage = (student: Student) => {
    const subject = `EduGestão - Mensalidade Pendente: ${student.name}`;
    const body = `Olá ${student.guardian},\n\nInformamos que a mensalidade do aluno(a) ${student.name} está pendente.\n\nAtenciosamente,\nEduGestão`;
    const email = "evelyn.nsg@gmail.com"; // User requested example email
    window.location.href = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    toast.info("Direcionando para o e-mail...");
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-6 duration-700">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h2 className="text-3xl font-black text-[#0e1a2b] tracking-tight">Gestão Financeira</h2>
          <p className="text-gray-400 font-bold text-sm uppercase tracking-widest mt-1">Controle de Mensalidades</p>
        </div>
        <div className="flex flex-col sm:flex-row items-center gap-4 w-full md:w-auto">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-300" size={20} />
            <input 
              type="text" 
              placeholder="Buscar aluno..." 
              className="w-full bg-white border border-gray-100 rounded-[24px] pl-14 pr-6 py-4 text-[15px] focus:ring-4 focus:ring-[#1a2f4e]/10 outline-none shadow-sm transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex bg-white p-1.5 rounded-[24px] border border-gray-100 shadow-sm">
            {(['all', 'pending', 'overdue'] as const).map(f => (
              <button key={f} onClick={() => setFilter(f)} className={`px-6 py-3 rounded-[20px] text-[13px] font-black transition-all duration-300 ${filter === f ? "bg-[#1a2f4e] text-white shadow-lg shadow-[#1a2f4e]/20" : "text-gray-400 hover:text-[#1a2f4e]"}`}>
                {f === 'all' ? 'Todos' : f === 'pending' ? 'Pendentes' : 'Atrasados'}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-[20px] shadow-sm border border-gray-100 flex flex-col gap-2">
          <p className="text-sm text-gray-500 font-medium">Inadimplência Geral</p>
          <p className="text-3xl font-bold text-[#f06d5e]">
            R$ {(students.filter(s => s.financialStatus !== 'paid').length * 850).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
          <div className="flex items-center gap-1 text-xs text-[#f06d5e] mt-2">
            <TrendingUp size={14} className="rotate-180" />
            <span>Baseado em R$ 850,00 por aluno pendente</span>
          </div>
        </div>
        <button className="bg-[#1a2f4e] p-6 rounded-[20px] text-white flex flex-col items-center justify-center gap-3 hover:opacity-90 transition-opacity shadow-lg shadow-[#1a2f4e]/20">
          <FileText size={32} />
          <span className="font-bold text-lg">Gerar Boletos em Lote</span>
        </button>
        <button className="bg-[#2cb7a5] p-6 rounded-[20px] text-white flex flex-col items-center justify-center gap-3 hover:opacity-90 transition-opacity shadow-lg shadow-[#2cb7a5]/20">
          <Search size={32} />
          <span className="font-bold text-lg">Planilha de Inadimplência</span>
        </button>
      </div>

      <div className="bg-white rounded-[20px] shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Aluno</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Vencimento</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Valor</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Ações / Cobrança</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map(s => (
                <tr key={s.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-6 py-4 font-bold text-sm">{s.name}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">10/08/2026</td>
                  <td className="px-6 py-4 text-sm font-bold">R$ 850,00</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-md text-xs font-bold ${s.financialStatus === 'paid' ? "bg-green-100 text-green-700" : s.financialStatus === 'overdue' ? "bg-red-100 text-red-700" : "bg-yellow-100 text-yellow-700"}`}>
                      {s.financialStatus === 'paid' ? "Pago" : s.financialStatus === 'overdue' ? "Atrasado" : "Pendente"}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex gap-2 items-center">
                      <button 
                        onClick={() => handleToggleStatus(s.id)}
                        className={`px-3 py-1.5 text-white text-[10px] font-bold rounded-lg transition-colors flex items-center gap-1 shadow-sm ${s.financialStatus === 'paid' ? "bg-orange-500 hover:bg-orange-600" : "bg-green-500 hover:bg-green-600"}`}
                      >
                        {s.financialStatus === 'paid' ? "PENDENTE" : "PAGO"}
                      </button>
                      
                      {s.financialStatus !== 'paid' && (
                        <button 
                          onClick={() => handleWhatsAppMessage(s)}
                          title="Cobrar via WhatsApp"
                          className="p-2 bg-green-50 text-green-600 rounded-lg hover:bg-green-100 transition-colors"
                        >
                          <MessageSquare size={16} />
                        </button>
                      )}
                      
                      <button 
                        onClick={() => handleEmailMessage(s)}
                        title="Enviar e-mail" 
                        className="p-2 hover:bg-blue-50 text-blue-600 rounded-lg transition-colors"
                      >
                        <Bell size={16} />
                      </button>
                      <button title="Ver PDF" className="p-2 hover:bg-gray-50 text-gray-600 rounded-lg transition-colors"><FileText size={16} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}


function AcademicModule({ 
  students, 
  occurrences,
  studyProgress,
  onSaveProgress,
  setActiveTab
}: { 
  students: Student[], 
  occurrences: Occurrence[],
  studyProgress: StudyProgress[],
  onSaveProgress: (p: StudyProgress[]) => void,
  setActiveTab: (tab: string) => void
}) {
  const [filterClassroom, setFilterClassroom] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStudentId, setSelectedStudentId] = useState<number | null>(null);
  const [isAddingProgress, setIsAddingProgress] = useState(false);
  const [isViewingHistory, setIsViewingHistory] = useState(false);
  
  const [progressData, setProgressData] = useState({
    progress: 75,
    description: ''
  });


  const filtered = students.filter(s => {
    const matchClass = filterClassroom === "" || s.classroom === filterClassroom;
    const matchName = s.name.toLowerCase().includes(searchTerm.toLowerCase());
    return matchClass && matchName;
  });

  const classrooms = Array.from(new Set(students.map(s => s.classroom)));

  const handleAddProgress = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedStudentId === null) return;

    const newProgress: StudyProgress = {
      id: Date.now().toString(),
      studentId: selectedStudentId,
      date: new Date().toISOString(),
      progress: progressData.progress,
      description: progressData.description,
      recordedBy: "Coordenador(a)"
    };

    onSaveProgress([...studyProgress, newProgress]);
    setIsAddingProgress(false);
    setProgressData({ progress: 75, description: '' });
    toast.success("Progresso adicionado com sucesso!");
  };

  const handleDeleteProgress = (id: string) => {
    onSaveProgress(studyProgress.filter(p => p.id !== id));
    toast.info("Registro de progresso excluído.");
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-6 duration-700">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h2 className="text-3xl font-black text-[#0e1a2b] tracking-tight">Desenvolvimento de Progressão</h2>
          <p className="text-gray-400 font-bold text-sm uppercase tracking-widest mt-1">Acompanhamento Pedagógico Individual</p>
        </div>
        <div className="flex flex-col sm:flex-row items-center gap-4 w-full md:w-auto">
          <select 
            className="w-full sm:w-64 bg-white border border-gray-100 rounded-[24px] px-6 py-4 text-[15px] font-bold text-gray-500 focus:ring-4 focus:ring-[#1a2f4e]/10 outline-none shadow-sm transition-all cursor-pointer appearance-none"
            value={filterClassroom}
            onChange={e => setFilterClassroom(e.target.value)}
          >
            <option value="">Todas as Turmas</option>
            {classrooms.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-300" size={20} />
            <input 
              type="text" 
              placeholder="Buscar aluno..." 
              className="w-full bg-white border border-gray-100 rounded-[24px] pl-14 pr-6 py-4 text-[15px] focus:ring-4 focus:ring-[#1a2f4e]/10 outline-none shadow-sm transition-all"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      </div>

      {filtered.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map(s => {
            const studentProgress = studyProgress.filter(p => p.studentId === s.id).sort((a,b) => b.date.localeCompare(a.date));
            const latestProgress = studentProgress[0]?.progress ?? 75;
            
            return (
              <div key={s.id} className="bg-white p-8 rounded-[32px] shadow-sm border border-gray-100 space-y-6 flex flex-col group hover:shadow-xl hover:shadow-[#1a2f4e]/5 transition-all duration-300">
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#1a2f4e]/5 to-[#2a4a7a]/5 flex items-center justify-center text-[#1a2f4e] border border-[#1a2f4e]/10 transition-transform group-hover:scale-110">
                      <Users size={24} className="opacity-40" />
                    </div>
                    <div>
                      <h4 className="font-black text-[#0e1a2b] text-[15px]">{s.name}</h4>
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">{s.classroom}</p>
                    </div>
                  </div>
                  <span className="px-4 py-2 bg-blue-50 text-blue-600 rounded-2xl text-[10px] font-black uppercase tracking-wider ring-1 ring-blue-100">Progresso</span>
                </div>
                
                <div className="bg-gray-50/50 p-6 rounded-[24px] flex-1 border border-gray-100/50">
                  <p className="text-[10px] text-gray-400 font-black uppercase mb-3 tracking-[0.1em]">Última Ocorrência</p>
                  <p className="text-xs text-gray-500 font-medium italic leading-relaxed line-clamp-3">
                    {occurrences.filter(o => o.studentId === s.id).sort((a,b) => b.date.localeCompare(a.date))[0]?.description ?? "Sem ocorrências registradas."}
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                  <button 
                    onClick={() => { setSelectedStudentId(s.id); setIsViewingHistory(true); }}
                    className="flex-1 py-4 text-xs font-black border border-gray-100 rounded-[20px] hover:bg-gray-50 transition-all flex items-center justify-center gap-2 text-gray-500"
                  >
                    <Clock size={16} />
                    Histórico
                  </button>
                  <button 
                    onClick={() => { setSelectedStudentId(s.id); setIsAddingProgress(true); }}
                    className="flex-1 py-4 text-xs font-black bg-[#1a2f4e]/5 text-[#1a2f4e] rounded-[20px] hover:bg-[#1a2f4e] hover:text-white transition-all flex items-center justify-center gap-2"
                  >
                    <UserPlus size={16} />
                    Anotar
                  </button>
                </div>
                
                <button 
                  onClick={() => toast.info(`Exibindo todos os registros acadêmicos para ${s.name}`)}
                  className="w-full py-2 text-[10px] font-black text-gray-300 hover:text-[#1a2f4e] transition-colors uppercase tracking-[0.2em]"
                >
                  Boletim Completo
                </button>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-white p-20 rounded-[20px] shadow-sm border border-gray-100 flex flex-col items-center justify-center text-gray-400">
          <Database size={48} className="mb-4 opacity-20" />
          <p className="font-medium">Nenhum registro encontrado para esta busca.</p>
        </div>
      )}

      {/* Modal Adicionar Progresso */}
      {isAddingProgress && (
        <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-[25px] w-full max-w-lg max-h-[90vh] overflow-y-auto p-5 sm:p-8 relative shadow-2xl scale-in-center">
            <button onClick={() => setIsAddingProgress(false)} className="absolute right-6 top-6 p-2 hover:bg-gray-100 rounded-full transition-colors">
              <X size={24} />
            </button>
            <h3 className="text-xl font-bold mb-6 flex items-center gap-2 text-[#1a2f4e]">
              <TrendingUp size={24} />
              Adicionar Progresso: {students.find(s => s.id === selectedStudentId)?.name}
            </h3>
            <form onSubmit={handleAddProgress} className="space-y-6">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <label className="text-sm font-bold text-gray-600">Porcentagem de Desenvolvimento</label>
                  <span className="text-[#1a2f4e] font-bold">{progressData.progress}%</span>
                </div>
                <input 
                  type="range" 
                  min="0" 
                  max="100" 
                  className="w-full h-2 bg-gray-100 rounded-lg appearance-none cursor-pointer accent-[#1a2f4e]" 
                  value={progressData.progress} 
                  onChange={e => setProgressData({...progressData, progress: parseInt(e.target.value)})} 
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-600">Descrição / Notas Pedagógicas</label>
                <textarea 
                  required 
                  rows={4} 
                  placeholder="Descreva a evolução do aluno neste período..." 
                  className="w-full p-4 rounded-xl border border-gray-100 bg-[#f7f8fc] outline-none focus:ring-2 focus:ring-[#1a2f4e] resize-none" 
                  value={progressData.description} 
                  onChange={e => setProgressData({...progressData, description: e.target.value})} 
                />
              </div>
              <button type="submit" className="w-full py-4 bg-[#1a2f4e] text-white font-bold rounded-xl hover:opacity-90 transition-opacity shadow-lg shadow-[#1a2f4e]/20">
                Salvar Progresso
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Modal Histórico de Progresso */}
      {isViewingHistory && (
        <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-[25px] w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col relative shadow-2xl scale-in-center">
            <div className="p-8 border-b border-gray-100 flex justify-between items-center bg-[#1a2f4e] text-white">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
                  <Clock size={24} />
                </div>
                <div>
                  <h3 className="text-xl font-bold">{students.find(s => s.id === selectedStudentId)?.name}</h3>
                  <p className="text-white/70 text-sm font-medium">Histórico de Progressão de Estudos</p>
                </div>
              </div>
              <button onClick={() => setIsViewingHistory(false)} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                <X size={24} />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-8 space-y-6 bg-[#f7f8fc]">
              {studyProgress.filter(p => p.studentId === selectedStudentId).length > 0 ? (
                studyProgress
                  .filter(p => p.studentId === selectedStudentId)
                  .sort((a,b) => b.date.localeCompare(a.date))
                  .map((p, idx) => (
                    <div key={p.id} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 relative group animate-in slide-in-from-left-4 duration-300" style={{ animationDelay: `${idx * 100}ms` }}>
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex items-center gap-3">
                          <span className="w-10 h-10 rounded-lg bg-[#1a2f4e]/10 text-[#1a2f4e] flex items-center justify-center font-bold">
                            {p.progress}%
                          </span>
                          <div>
                            <p className="text-sm font-bold text-gray-700">Registrado em {new Date(p.date).toLocaleDateString('pt-BR')}</p>
                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Por: {p.recordedBy}</p>
                          </div>
                        </div>
                        <button 
                          onClick={() => handleDeleteProgress(p.id)}
                          className="text-gray-300 hover:text-red-500 transition-colors p-2"
                          title="Excluir este registro"
                        >
                          <X size={18} />
                        </button>
                      </div>
                      <div className="p-4 bg-[#f7f8fc] rounded-xl border border-gray-50 italic text-gray-600 text-sm leading-relaxed">
                        "{p.description}"
                      </div>
                    </div>
                  ))
              ) : (
                <div className="flex flex-col items-center justify-center py-20 text-gray-400 gap-4">
                  <Search size={48} className="opacity-10" />
                  <p className="font-bold">Nenhum histórico encontrado.</p>
                  <button 
                    onClick={() => { setIsViewingHistory(false); setIsAddingProgress(true); }}
                    className="text-[#1a2f4e] text-sm font-bold hover:underline"
                  >
                    Adicionar o primeiro registro agora
                  </button>
                </div>
              )}
            </div>
            
            <div className="p-6 bg-white border-t border-gray-100 flex justify-end gap-3">
              <button onClick={() => setIsViewingHistory(false)} className="px-6 py-2.5 font-bold text-gray-500 hover:bg-gray-50 rounded-xl transition-colors">Fechar</button>
              <button 
                onClick={() => { setIsViewingHistory(false); setIsAddingProgress(true); }}
                className="px-6 py-2.5 bg-[#1a2f4e] text-white font-bold rounded-xl hover:opacity-90 transition-all shadow-md shadow-[#1a2f4e]/10"
              >
                Novo Registro
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


function MeetingsModule({ students, meetings, onSaveMeetings }: { students: Student[], meetings: any[], onSaveMeetings: (newMeetings: any[]) => void }) {
  const [isAdding, setIsAdding] = useState(false);
  const [viewingPauta, setViewingPauta] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());


  const [formData, setFormData] = useState({
    date: '',
    time: '',
    title: '',
    responsible: '',
    pauta: ''
  });

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const dateObj = new Date(formData.date);
    const newMeeting = {
      ...formData,
      id: Date.now(),
      month: dateObj.toLocaleString('pt-BR', { month: 'short' }).toUpperCase().substring(0, 3),
      day: dateObj.getDate() + 1
    };
    onSaveMeetings([newMeeting, ...meetings]);
    setIsAdding(false);
    setFormData({ date: '', time: '', title: '', responsible: '', pauta: '' });
    toast.success("Reunião agendada com sucesso!");
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-6 duration-700">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h2 className="text-3xl font-black text-[#0e1a2b] tracking-tight">Reunião de Pais</h2>
          <p className="text-gray-400 font-bold text-sm uppercase tracking-widest mt-1">Calendário Participativo</p>
        </div>
        <button 
          onClick={() => setIsAdding(true)}
          className="whitespace-nowrap bg-[#1a2f4e] text-white px-8 py-4 rounded-[24px] font-black text-[15px] hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center gap-3 shadow-xl shadow-[#1a2f4e]/20"
        >
          <UserPlus size={20} />
          Agendar Nova
        </button>
      </div>

      {isAdding && (
        <div className="fixed inset-0 bg-[#0e1a2b]/20 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-[40px] w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 sm:p-10 relative shadow-2xl animate-in fade-in zoom-in-95 duration-300">
            <button onClick={() => setIsAdding(false)} className="absolute right-8 top-8 p-3 hover:bg-gray-100 rounded-full transition-all group">
              <X size={24} className="text-gray-400 group-hover:text-[#0e1a2b]" />
            </button>
            <h3 className="text-2xl font-black text-[#0e1a2b] mb-8">Agendar Nova Reunião</h3>
            <form onSubmit={handleSave} className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-600">Data</label>
                  <input required type="date" className="w-full p-4 rounded-[20px] border border-gray-100 bg-gray-50/50 outline-none focus:ring-4 focus:ring-[#1a2f4e]/10 transition-all text-[15px]" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-600">Horário</label>
                  <input required type="time" className="w-full p-4 rounded-[20px] border border-gray-100 bg-gray-50/50 outline-none focus:ring-4 focus:ring-[#1a2f4e]/10 transition-all text-[15px]" value={formData.time} onChange={e => setFormData({...formData, time: e.target.value})} />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-600">Título / Turma</label>
                <input required type="text" placeholder="Ex: Reunião Geral - 2º Ano B" className="w-full p-4 rounded-[20px] border border-gray-100 bg-gray-50/50 outline-none focus:ring-4 focus:ring-[#1a2f4e]/10 transition-all text-[15px]" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-600">Responsável pela Reunião</label>
                <input required type="text" placeholder="Nome do professor ou coordenador" className="w-full p-4 rounded-[20px] border border-gray-100 bg-gray-50/50 outline-none focus:ring-4 focus:ring-[#1a2f4e]/10 transition-all text-[15px]" value={formData.responsible} onChange={e => setFormData({...formData, responsible: e.target.value})} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-600">Pauta da Reunião</label>
                <textarea required rows={4} placeholder="Descreva os tópicos que serão abordados..." className="w-full p-4 rounded-[20px] border border-gray-100 bg-gray-50/50 outline-none focus:ring-4 focus:ring-[#1a2f4e]/10 transition-all text-[15px] resize-none" value={formData.pauta} onChange={e => setFormData({...formData, pauta: e.target.value})} />
              </div>
              <button type="submit" className="w-full py-5 bg-[#1a2f4e] text-white font-black rounded-[24px] hover:scale-[1.01] active:scale-[0.99] transition-all shadow-xl shadow-[#1a2f4e]/20 mt-4">Confirmar Agendamento</button>
            </form>
          </div>
        </div>
      )}

      {viewingPauta !== null && (
        <div className="fixed inset-0 bg-[#0e1a2b]/20 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
          <div className="bg-white rounded-[40px] w-full max-w-lg max-h-[90vh] overflow-y-auto p-6 sm:p-10 relative shadow-2xl animate-in fade-in zoom-in-95 duration-300">
            <button onClick={() => setViewingPauta(null)} className="absolute right-8 top-8 p-3 hover:bg-gray-100 rounded-full transition-all group">
              <X size={24} className="text-gray-400 group-hover:text-[#0e1a2b]" />
            </button>
            <div className="flex items-center gap-4 mb-8">
              <div className="w-14 h-14 bg-[#1a2f4e]/10 rounded-2xl flex items-center justify-center text-[#1a2f4e]">
                <BookOpen size={28} />
              </div>
              <div>
                <h3 className="text-2xl font-black text-[#0e1a2b]">Detalhes da Reunião</h3>
                <p className="text-gray-400 font-bold text-xs uppercase tracking-widest">Informações do Agendamento</p>
              </div>
            </div>

            {(() => {
              const meeting = meetings.find(m => m.pauta === viewingPauta);
              if (!meeting) return <div className="p-6 bg-[#f7f8fc] rounded-3xl border border-gray-100 text-gray-700 leading-relaxed italic">"{viewingPauta}"</div>;
              
              return (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="p-4 bg-gray-50 rounded-2xl">
                      <p className="text-[10px] font-black text-gray-400 uppercase mb-1">Data e Hora</p>
                      <p className="font-bold text-[#0e1a2b] text-sm">
                        {new Date(meeting.date).toLocaleDateString('pt-BR')} às {meeting.time}
                      </p>
                    </div>
                    <div className="p-4 bg-gray-50 rounded-2xl">
                      <p className="text-[10px] font-black text-gray-400 uppercase mb-1">Responsável</p>
                      <p className="font-bold text-[#0e1a2b] text-sm">{meeting.responsible}</p>
                    </div>
                  </div>
                  
                  <div className="p-4 bg-[#1a2f4e]/5 rounded-2xl border border-[#1a2f4e]/10">
                    <p className="text-[10px] font-black text-[#1a2f4e] uppercase mb-1">Título / Turma</p>
                    <p className="font-black text-[#0e1a2b]">{meeting.title}</p>
                  </div>

                  <div className="space-y-2">
                    <p className="text-[10px] font-black text-gray-400 uppercase ml-2">Pauta da Reunião</p>
                    <div className="p-6 bg-gray-50 rounded-3xl border border-gray-100 text-gray-700 leading-relaxed text-sm italic">
                      "{meeting.pauta}"
                    </div>
                  </div>
                </div>
              );
            })()}
            
            <button 
              onClick={() => setViewingPauta(null)} 
              className="w-full mt-8 py-5 bg-[#1a2f4e] text-white font-black rounded-[24px] hover:scale-[1.01] active:scale-[0.99] transition-all shadow-xl shadow-[#1a2f4e]/20"
            >
              Fechar Detalhes
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white p-8 rounded-[32px] shadow-sm border border-gray-100">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-black text-[#0e1a2b] flex items-center gap-3">
              <CalendarCheck size={22} className="text-[#1a2f4e]" /> 
              Calendário de Reuniões
            </h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="calendar-container">
              <Calendar 
                onChange={(value) => setSelectedDate(value as Date)} 
                value={selectedDate}
                className="rounded-2xl border-none shadow-sm p-4 w-full bg-gray-50/50"
                tileClassName={({ date }) => {
                  const hasMeeting = meetings.some(m => {
                    const mDate = new Date(m.date);
                    return mDate.getUTCDate() === date.getDate() && 
                           mDate.getUTCMonth() === date.getMonth() && 
                           mDate.getUTCFullYear() === date.getFullYear();
                  });
                  return hasMeeting ? 'has-meeting-tile' : '';
                }}
              />
              <style>{`
                .react-calendar { border: none !important; font-family: inherit; width: 100% !important; border-radius: 24px; }
                .react-calendar__navigation button { font-weight: 800; color: #0e1a2b; }
                .react-calendar__month-view__weekdays__weekday { font-weight: 700; color: #1a2f4e; text-transform: uppercase; font-size: 0.7rem; }
                .react-calendar__tile--now { background: #1a2f4e10 !important; color: #1a2f4e !important; border-radius: 12px; }
                .react-calendar__tile--active { background: #1a2f4e !important; color: white !important; border-radius: 12px; box-shadow: 0 10px 15px -3px rgba(103, 80, 164, 0.3); }
                .react-calendar__tile:hover { background: #f3f4f6; border-radius: 12px; }
                .has-meeting-tile { position: relative; font-weight: 900 !important; color: #1a2f4e !important; }
                .has-meeting-tile::after { content: ''; position: absolute; bottom: 4px; left: 50%; transform: translateX(-50%); width: 4px; height: 4px; background: #f06d5e; border-radius: 50%; }
              `}</style>
            </div>

            <div className="space-y-4">
              <h4 className="text-sm font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                <Clock size={16} /> 
                {selectedDate.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' })}
              </h4>
              <div className="space-y-3 overflow-y-auto max-h-[300px] pr-2 custom-scrollbar">
                {meetings.filter(m => {
                  const mDate = new Date(m.date);
                  return mDate.getUTCDate() === selectedDate.getDate() && 
                         mDate.getUTCMonth() === selectedDate.getMonth() && 
                         mDate.getUTCFullYear() === selectedDate.getFullYear();
                }).length > 0 ? (
                  meetings.filter(m => {
                    const mDate = new Date(m.date);
                    return mDate.getUTCDate() === selectedDate.getDate() && 
                           mDate.getUTCMonth() === selectedDate.getMonth() && 
                           mDate.getUTCFullYear() === selectedDate.getFullYear();
                  }).map(meeting => (
                    <div key={meeting.id} className="p-5 bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all group">
                      <div className="flex justify-between items-start mb-2">
                        <p className="font-black text-[#0e1a2b] text-sm">{meeting.title}</p>
                        <span className="text-[10px] font-black bg-[#1a2f4e]/10 text-[#1a2f4e] px-2 py-1 rounded-lg">{meeting.time}</span>
                      </div>
                      <p className="text-[10px] text-gray-400 font-bold uppercase mb-3">Responsável: {meeting.responsible}</p>
                      <button 
                        onClick={() => setViewingPauta(meeting.pauta)}
                        className="w-full py-2 bg-[#1a2f4e]/10 text-[#1a2f4e] text-[10px] font-black rounded-xl hover:bg-[#1a2f4e] hover:text-white transition-all"
                      >
                        Ver Detalhes
                      </button>
                    </div>
                  ))
                ) : (
                  <div className="py-10 text-center bg-gray-50/50 rounded-3xl border border-dashed border-gray-200">
                    <p className="text-xs font-bold text-gray-400">Nenhuma reunião para este dia</p>
                    <button 
                      onClick={() => {
                        const dateStr = selectedDate.toISOString().split('T')[0];
                        setFormData({...formData, date: dateStr || ''});
                        setIsAdding(true);
                      }}
                      className="text-[#1a2f4e] text-[10px] font-black mt-2 hover:underline"
                    >
                      Agendar Agora +
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white p-8 rounded-[32px] shadow-sm border border-gray-100 flex flex-col">
          <h3 className="text-xl font-black text-[#0e1a2b] mb-6 flex items-center gap-3">
            <FileText size={22} className="text-[#1a2f4e]" /> 
            Histórico Geral
          </h3>
          <div className="space-y-4 overflow-y-auto flex-1 pr-2 custom-scrollbar">
            {meetings.length > 0 ? meetings.map(meeting => (
              <div key={meeting.id} className="p-4 bg-gray-50/50 rounded-2xl border border-transparent hover:border-gray-100 hover:bg-white transition-all cursor-pointer group" onClick={() => {
                setSelectedDate(new Date(meeting.date));
                setViewingPauta(meeting.pauta);
              }}>
                <div className="flex gap-4 items-center">
                  <div className="w-10 h-10 bg-white rounded-xl flex flex-col items-center justify-center text-[8px] font-black shadow-sm border border-gray-100 group-hover:bg-[#1a2f4e] group-hover:text-white transition-all">
                    <span className={meeting.month === 'DEZ' ? 'text-red-400' : 'text-[#f06d5e]'}>{meeting.month}</span>
                    <span className="text-sm -mt-1 group-hover:text-white">{meeting.day}</span>
                  </div>
                  <div>
                    <p className="font-bold text-[#0e1a2b] text-xs line-clamp-1 group-hover:text-[#1a2f4e] transition-colors">{meeting.title}</p>
                    <p className="text-[9px] text-gray-400 font-bold uppercase">{meeting.time} • {meeting.responsible}</p>
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t border-gray-100/50 flex justify-between items-center opacity-0 group-hover:opacity-100 transition-opacity">
                   <span className="text-[9px] font-black text-[#1a2f4e] uppercase tracking-widest">Clique para ver detalhes</span>
                   <Search size={14} className="text-[#1a2f4e]" />
                </div>
              </div>
            )) : (
              <div className="text-center py-10">
                <p className="text-sm font-bold text-gray-300">Sem histórico</p>
              </div>
            )}
          </div>
        </div>
      </div>

    </div>
  );
}

function OccurrencesModule({ 
  students, 
  occurrences, 
  onSave 
}: { 
  students: Student[], 
  occurrences: Occurrence[], 
  onSave: (o: Occurrence[]) => void 
}) {
  const [isAdding, setIsAdding] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterClassroom, setFilterClassroom] = useState("");
  const [filterSubject, setFilterSubject] = useState("");

  const [formData, setFormData] = useState({
    studentId: '',
    subject: '',
    description: '',
    severity: 'low' as const
  });

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const student = students.find(s => s.id === Number(formData.studentId));
    if (!student) {
      toast.error("Selecione um aluno válido");
      return;
    }

    const newOccurrence: Occurrence = {
      id: Date.now().toString(),
      studentId: student.id,
      studentName: student.name,
      classroom: student.classroom,
      date: new Date().toISOString().split('T')[0] || new Date().toISOString(),
      subject: formData.subject,
      description: formData.description,
      severity: formData.severity
    };

    onSave([...occurrences, newOccurrence]);
    setIsAdding(false);
    setFormData({ studentId: '', subject: '', description: '', severity: 'low' });
  };

  const filtered = occurrences.filter(o => {
    const matchName = o.studentName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchClass = filterClassroom === "" || o.classroom === filterClassroom;
    const matchSubject = filterSubject === "" || o.subject === filterSubject;
    return matchName && matchClass && matchSubject;
  });

  const classrooms = Array.from(new Set(students.map(s => s.classroom)));
  const subjects = Array.from(new Set(occurrences.map(o => o.subject)));

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-6 duration-700">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h2 className="text-3xl font-black text-[#0e1a2b] tracking-tight">Registro de Ocorrências</h2>
          <p className="text-gray-400 font-bold text-sm uppercase tracking-widest mt-1">Gestão Disciplinar e Elogios</p>
        </div>
        <button 
          onClick={() => setIsAdding(!isAdding)}
          className={`whitespace-nowrap ${isAdding ? "bg-gray-100 text-gray-500" : "bg-[#1a2f4e] text-white shadow-xl shadow-[#1a2f4e]/20"} px-8 py-4 rounded-[24px] font-black text-[15px] hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center gap-3`}
        >
          {isAdding ? <X size={20} /> : <AlertCircle size={20} />}
          {isAdding ? "Cancelar Registro" : "Nova Ocorrência"}
        </button>
      </div>

      {isAdding && (
        <div className="bg-white p-8 rounded-[25px] shadow-sm border border-gray-100 scale-in-center">
          <form onSubmit={handleSave} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-600">Aluno</label>
                <select 
                  required 
                  className="w-full p-3 rounded-xl border border-gray-100 bg-[#f7f8fc] outline-none focus:ring-2 focus:ring-[#1a2f4e]"
                  value={formData.studentId}
                  onChange={e => setFormData({...formData, studentId: e.target.value})}
                >
                  <option value="">Selecione um aluno...</option>
                  {students.map(s => (
                    <option key={s.id} value={s.id}>{s.name} - {s.classroom}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-600">Tema / Tipo</label>
                <input 
                  required
                  type="text"
                  placeholder="Ex: Comportamento, Atraso, Elogio..."
                  className="w-full p-3 rounded-xl border border-gray-100 bg-[#f7f8fc] outline-none focus:ring-2 focus:ring-[#1a2f4e]"
                  value={formData.subject}
                  onChange={e => setFormData({...formData, subject: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-600">Gravidade</label>
                <select 
                  className="w-full p-3 rounded-xl border border-gray-100 bg-[#f7f8fc] outline-none focus:ring-2 focus:ring-[#1a2f4e]"
                  value={formData.severity}
                  onChange={e => setFormData({...formData, severity: e.target.value as any})}
                >
                  <option value="low">Baixa (Informativa)</option>
                  <option value="medium">Média (Atenção)</option>
                  <option value="high">Alta (Crítica)</option>
                </select>
              </div>
              <div className="md:col-span-2 space-y-2">
                <label className="text-sm font-bold text-gray-600">Observações</label>
                <textarea 
                  required
                  rows={4}
                  className="w-full p-3 rounded-xl border border-gray-100 bg-[#f7f8fc] outline-none focus:ring-2 focus:ring-[#1a2f4e] resize-none"
                  value={formData.description}
                  onChange={e => setFormData({...formData, description: e.target.value})}
                />
              </div>
            </div>
            <button type="submit" className="w-full py-4 bg-[#2cb7a5] text-white font-bold rounded-xl hover:opacity-90 transition-opacity">
              Salvar Registro
            </button>
          </form>
        </div>
      )}

      {/* Busca e Filtros */}
      <div className="bg-white p-8 rounded-[32px] shadow-sm border border-gray-100">
        <h3 className="text-xl font-black text-[#0e1a2b] mb-8 flex items-center gap-3">
          <Search size={22} className="text-[#1a2f4e]" /> 
          Filtrar Registros
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="space-y-3">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Buscar por Aluno</label>
            <div className="relative">
              <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-300" size={18} />
              <input 
                type="text"
                placeholder="Nome do aluno..."
                className="w-full bg-gray-50/50 border border-gray-100 rounded-[20px] pl-12 pr-4 py-4 text-[15px] focus:ring-4 focus:ring-[#1a2f4e]/10 transition-all outline-none"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-3">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Turma / Sala</label>
            <select 
              className="w-full bg-gray-50/50 border border-gray-100 rounded-[20px] px-6 py-4 text-[15px] focus:ring-4 focus:ring-[#1a2f4e]/10 transition-all outline-none appearance-none"
              value={filterClassroom}
              onChange={e => setFilterClassroom(e.target.value)}
            >
              <option value="">Todas as Turmas</option>
              {classrooms.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="space-y-3">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Tema da Ocorrência</label>
            <select 
              className="w-full bg-gray-50/50 border border-gray-100 rounded-[20px] px-6 py-4 text-[15px] focus:ring-4 focus:ring-[#1a2f4e]/10 transition-all outline-none appearance-none"
              value={filterSubject}
              onChange={e => setFilterSubject(e.target.value)}
            >
              <option value="">Todos os Temas</option>
              {subjects.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Lista de Ocorrências */}
      <div className="bg-white rounded-[32px] shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50/50 border-b border-gray-100">
              <tr>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Data</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Aluno / Turma</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Tema</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Observação</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Gravidade</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.length > 0 ? filtered.map(o => (
                <tr key={o.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-6 py-4 text-sm font-medium">{new Date(o.date).toLocaleDateString('pt-BR')}</td>
                  <td className="px-6 py-4">
                    <p className="font-bold text-sm">{o.studentName}</p>
                    <p className="text-[10px] text-gray-400 font-bold uppercase">{o.classroom}</p>
                  </td>
                  <td className="px-6 py-4 text-sm font-bold text-[#1a2f4e]">{o.subject}</td>
                  <td className="px-6 py-4 text-sm text-gray-600 max-w-xs truncate" title={o.description}>{o.description}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase ${
                      o.severity === 'high' ? "bg-red-100 text-red-700" :
                      o.severity === 'medium' ? "bg-yellow-100 text-yellow-700" :
                      "bg-blue-100 text-blue-700"
                    }`}>
                      {o.severity === 'high' ? 'Crítica' : o.severity === 'medium' ? 'Atenção' : 'Info'}
                    </span>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-400">
                    <div className="flex flex-col items-center gap-2">
                      <Search size={32} />
                      <p className="text-sm font-medium">Nenhuma ocorrência encontrada com os filtros aplicados.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function MaterialsModule() {
  const [materials, setMaterials] = useState<Material[]>([
    { id: 1, name: "Resma Papel A4", quantity: 45, minQuantity: 10, category: "Escritório", price: 25.50 },
    { id: 2, name: "Giz Colorido", quantity: 8, minQuantity: 20, category: "Pedagógico", price: 12.00 },
    { id: 3, name: "Caneta Azul", quantity: 150, minQuantity: 50, category: "Escritório", price: 1.50 },
    { id: 4, name: "Cola Branca 1kg", quantity: 5, minQuantity: 12, category: "Pedagógico", price: 18.90 },
    { id: 5, name: "Livro de Matemática 1º Ano", quantity: 30, minQuantity: 30, category: "Livros", price: 85.00 },
  ]);
  const [transactions, setTransactions] = useState<MaterialTransaction[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAddingMaterial, setIsAddingMaterial] = useState(false);
  const [modalType, setModalType] = useState<'in' | 'out'>('in');
  const [formData, setFormData] = useState({
    materialId: '',
    quantity: '',
    sourceOrDest: '',
    reason: '',
  });

  const [newMaterialData, setNewMaterialData] = useState({
    name: '',
    category: '',
    minQuantity: '',
    initialQuantity: '',
    price: ''
  });

  const handleAddMaterial = (e: React.FormEvent) => {
    e.preventDefault();
    const newMaterial: Material = {
      id: Date.now(),
      name: newMaterialData.name,
      category: newMaterialData.category,
      minQuantity: Number(newMaterialData.minQuantity),
      quantity: Number(newMaterialData.initialQuantity),
      price: Number(newMaterialData.price) || undefined
    };

    setMaterials([...materials, newMaterial]);
    setIsAddingMaterial(false);
    setNewMaterialData({ name: '', category: '', minQuantity: '', initialQuantity: '', price: '' });
    toast.success("Novo material cadastrado!");
  };

  const handleTransaction = (e: React.FormEvent) => {
    e.preventDefault();
    const matId = Number(formData.materialId);
    const qty = Number(formData.quantity);
    const material = materials.find(m => m.id === matId);

    if (!material) {
      toast.error("Selecione um material válido");
      return;
    }

    if (modalType === 'out' && material.quantity < qty) {
      toast.error("Estoque insuficiente para esta saída!");
      return;
    }

    const newTransaction: MaterialTransaction = {
      id: Date.now().toString(),
      materialId: matId,
      type: modalType,
      quantity: qty,
      date: new Date().toLocaleDateString('pt-BR'),
      sourceOrDest: formData.sourceOrDest,
      reason: formData.reason,
      recordedBy: "Nataly Wingerter"
    };

    setTransactions([newTransaction, ...transactions]);
    setMaterials(materials.map(m => 
      m.id === matId 
        ? { ...m, quantity: modalType === 'in' ? m.quantity + qty : m.quantity - qty } 
        : m
    ));
    setIsModalOpen(false);
    setFormData({ materialId: '', quantity: '', sourceOrDest: '', reason: '' });
    toast.success(`${modalType === 'in' ? 'Entrada' : 'Saída'} registrada com sucesso!`);
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-6 duration-700">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h2 className="text-3xl font-black text-[#0e1a2b] tracking-tight">Estoque e Materiais</h2>
          <p className="text-gray-400 font-bold text-sm uppercase tracking-widest mt-1">Gestão de Insumos Escolares</p>
        </div>
        <div className="flex flex-wrap gap-4 w-full md:w-auto">
          <button 
            onClick={() => setIsAddingMaterial(!isAddingMaterial)}
            className={`flex-1 md:flex-none px-6 py-4 rounded-[24px] font-black text-[15px] transition-all flex items-center justify-center gap-3 ${isAddingMaterial ? "bg-gray-100 text-gray-500" : "bg-[#1a2f4e] text-white shadow-xl shadow-[#1a2f4e]/20"}`}
          >
            {isAddingMaterial ? <X size={20} /> : <UserPlus size={20} />}
            {isAddingMaterial ? "Cancelar" : "Novo Cadastro"}
          </button>
          <button 
            onClick={() => { setModalType('in'); setIsModalOpen(true); }}
            className="flex-1 md:flex-none px-6 py-4 bg-[#2cb7a5] text-white rounded-[24px] font-black text-[15px] hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3 shadow-xl shadow-[#2cb7a5]/20"
          >
            <TrendingUp size={20} /> Entrada
          </button>
          <button 
            onClick={() => { setModalType('out'); setIsModalOpen(true); }}
            className="flex-1 md:flex-none px-6 py-4 bg-[#f06d5e] text-white rounded-[24px] font-black text-[15px] hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3 shadow-xl shadow-[#f06d5e]/20"
          >
            <TrendingUp size={20} className="rotate-180" /> Saída
          </button>
        </div>
      </div>

      {isAddingMaterial && (
        <div className="bg-white p-10 rounded-[40px] shadow-sm border border-gray-100 animate-in fade-in zoom-in-95 duration-300">
          <h3 className="text-xl font-black mb-8 flex items-center gap-3 text-[#0e1a2b]">
            <Package size={24} className="text-[#1a2f4e]" /> Cadastrar Novo Material
          </h3>
          <form onSubmit={handleAddMaterial} className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="space-y-3">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Nome do Material</label>
                <input required type="text" className="w-full p-4 rounded-[20px] border border-gray-100 bg-gray-50/50 outline-none focus:ring-4 focus:ring-[#1a2f4e]/10 transition-all text-[15px]" value={newMaterialData.name} onChange={e => setNewMaterialData({...newMaterialData, name: e.target.value})} />
              </div>
              <div className="space-y-3">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Categoria</label>
                <input required type="text" className="w-full p-4 rounded-[20px] border border-gray-100 bg-gray-50/50 outline-none focus:ring-4 focus:ring-[#1a2f4e]/10 transition-all text-[15px]" value={newMaterialData.category} onChange={e => setNewMaterialData({...newMaterialData, category: e.target.value})} />
              </div>
              <div className="space-y-3">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Qtd. Inicial</label>
                <input required type="number" min="0" className="w-full p-4 rounded-[20px] border border-gray-100 bg-gray-50/50 outline-none focus:ring-4 focus:ring-[#1a2f4e]/10 transition-all text-[15px]" value={newMaterialData.initialQuantity} onChange={e => setNewMaterialData({...newMaterialData, initialQuantity: e.target.value})} />
              </div>
              <div className="space-y-3">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Qtd. Mínima (Alerta)</label>
                <input required type="number" min="0" className="w-full p-4 rounded-[20px] border border-gray-100 bg-gray-50/50 outline-none focus:ring-4 focus:ring-[#1a2f4e]/10 transition-all text-[15px]" value={newMaterialData.minQuantity} onChange={e => setNewMaterialData({...newMaterialData, minQuantity: e.target.value})} />
              </div>
              <div className="space-y-3">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Preço Unitário (Opcional)</label>
                <input type="number" step="0.01" className="w-full p-4 rounded-[20px] border border-gray-100 bg-gray-50/50 outline-none focus:ring-4 focus:ring-[#1a2f4e]/10 transition-all text-[15px]" value={newMaterialData.price} onChange={e => setNewMaterialData({...newMaterialData, price: e.target.value})} />
              </div>
            </div>
            <button type="submit" className="w-full py-5 bg-[#1a2f4e] text-white font-black rounded-[24px] hover:scale-[1.01] active:scale-[0.99] transition-all shadow-xl shadow-[#1a2f4e]/20">
              Salvar Material
            </button>
          </form>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white rounded-[32px] shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-8 border-b border-gray-50">
            <h3 className="text-xl font-black text-[#0e1a2b] flex items-center gap-3">
              <Package size={22} className="text-[#1a2f4e]" /> 
              Inventário Disponível
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-gray-50/50 border-b border-gray-100">
                <tr>
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Material</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Categoria</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Qtd</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-sm">
                {materials.map(m => (
                  <tr key={m.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 font-bold">{m.name}</td>
                    <td className="px-6 py-4 text-gray-500">{m.category}</td>
                    <td className="px-6 py-4 font-bold">{m.quantity}</td>
                    <td className="px-6 py-4">
                      {m.quantity <= m.minQuantity ? (
                        <span className="px-2 py-1 bg-red-100 text-red-700 rounded-md text-[10px] font-bold">REPOR</span>
                      ) : (
                        <span className="px-2 py-1 bg-green-100 text-green-700 rounded-md text-[10px] font-bold">OK</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-white rounded-[32px] shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-8 border-b border-gray-50">
            <h3 className="text-xl font-black text-[#0e1a2b] flex items-center gap-3">
              <Clock size={22} className="text-[#1a2f4e]" /> 
              Histórico
            </h3>
          </div>
          <div className="p-6 space-y-4 max-h-[600px] overflow-y-auto">
            {transactions.length > 0 ? transactions.map(t => (
              <div key={t.id} className={`p-4 rounded-xl border-l-4 ${t.type === 'in' ? 'border-green-400 bg-green-50/30' : 'border-red-400 bg-red-50/30'}`}>
                <div className="flex justify-between items-start mb-1">
                  <p className="font-bold text-sm">{materials.find(m => m.id === t.materialId)?.name}</p>
                  <span className={`text-[10px] font-bold uppercase ${t.type === 'in' ? 'text-green-600' : 'text-red-600'}`}>
                    {t.type === 'in' ? `+${t.quantity}` : `-${t.quantity}`}
                  </span>
                </div>
                <p className="text-[10px] text-gray-500 font-medium">
                  {t.type === 'in' ? `Fornec: ${t.sourceOrDest}` : `Destino: ${t.sourceOrDest}`}
                </p>
                <p className="text-[10px] text-gray-400 mt-1">{t.date} • {t.recordedBy}</p>
              </div>
            )) : (
              <p className="text-center text-gray-400 py-10 text-sm italic">Nenhuma movimentação.</p>
            )}
          </div>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-[40px] w-full max-w-lg max-h-[90vh] overflow-y-auto p-6 sm:p-10 relative shadow-2xl animate-in fade-in zoom-in-95 duration-300">
            <button onClick={() => setIsModalOpen(false)} className="absolute right-8 top-8 p-2 hover:bg-gray-100 rounded-full transition-colors">
              <X size={24} />
            </button>
            <h3 className="text-2xl font-black mb-8 flex items-center gap-3 text-[#0e1a2b]">
              {modalType === 'in' ? <TrendingUp size={28} className="text-[#2cb7a5]" /> : <TrendingUp size={28} className="text-[#f06d5e] rotate-180" />}
              Registrar {modalType === 'in' ? 'Entrada' : 'Saída'}
            </h3>
            <form onSubmit={handleTransaction} className="space-y-6">
              <div className="space-y-3">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Material</label>
                <select 
                  required 
                  className="w-full p-4 rounded-[20px] border border-gray-100 bg-gray-50/50 outline-none focus:ring-4 focus:ring-[#1a2f4e]/10 transition-all text-[15px] appearance-none cursor-pointer"
                  value={formData.materialId}
                  onChange={e => setFormData({...formData, materialId: e.target.value})}
                >
                  <option value="">Selecione o material...</option>
                  {materials.map(m => <option key={m.id} value={m.id}>{m.name} (Atual: {m.quantity})</option>)}
                </select>
              </div>
              <div className="space-y-3">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Quantidade</label>
                <input required type="number" min="1" className="w-full p-4 rounded-[20px] border border-gray-100 bg-gray-50/50 outline-none focus:ring-4 focus:ring-[#1a2f4e]/10 transition-all text-[15px]" value={formData.quantity} onChange={e => setFormData({...formData, quantity: e.target.value})} />
              </div>
              <div className="space-y-3">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">{modalType === 'in' ? 'Fornecedor' : 'Destino (Turma/Setor)'}</label>
                <input required type="text" className="w-full p-4 rounded-[20px] border border-gray-100 bg-gray-50/50 outline-none focus:ring-4 focus:ring-[#1a2f4e]/10 transition-all text-[15px]" value={formData.sourceOrDest} onChange={e => setFormData({...formData, sourceOrDest: e.target.value})} />
              </div>
              <button 
                type="submit" 
                className={`w-full py-5 text-white font-black rounded-[24px] hover:scale-[1.01] active:scale-[0.99] transition-all shadow-xl ${modalType === 'in' ? 'bg-[#2cb7a5] shadow-[#2cb7a5]/20' : 'bg-[#f06d5e] shadow-[#f06d5e]/20'}`}
              >
                Confirmar Operação
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

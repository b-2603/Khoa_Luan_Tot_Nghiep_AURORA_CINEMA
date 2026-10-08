import React, { useState } from 'react';
import { User } from './types';
import { getCurrentUser } from './services/storage';
import { Navbar } from './components/Navbar';
import { Sidebar, NavTab } from './components/Sidebar';
import { OpenAiKeyModal } from './components/OpenAiKeyModal';
import { AiAssistantModal } from './components/AiAssistantModal';

// Pages
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { ProfilePage } from './pages/ProfilePage';
import { EmployeesPage } from './pages/EmployeesPage';
import { CreateEmployeePage } from './pages/CreateEmployeePage';
import { CoursesPage } from './pages/CoursesPage';
import { QuizzesPage } from './pages/QuizzesPage';
import { CertificatesPage } from './pages/CertificatesPage';
import { ManagerQuizCreatorPage } from './pages/ManagerQuizCreatorPage';
import { StaffShiftRegisterPage } from './pages/StaffShiftRegisterPage';
import { StaffShiftViewPage } from './pages/StaffShiftViewPage';
import { ManagerShiftSchedulerPage } from './pages/ManagerShiftSchedulerPage';
import { AttendancePage } from './pages/AttendancePage';
import { AttendanceExceptionsPage } from './pages/AttendanceExceptionsPage';

export function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(getCurrentUser());
  const [activeTab, setActiveTab] = useState<NavTab>('dashboard');

  const [isOpenAiKeyModalOpen, setIsOpenAiKeyModalOpen] = useState(false);
  const [isAiAssistantOpen, setIsAiAssistantOpen] = useState(false);

  const handleUserChange = (user: User | null) => {
    setCurrentUser(user);
    setActiveTab('dashboard');
  };

  // If NOT logged in, render authentic Login & Registration screen FIRST!
  if (!currentUser) {
    return <LoginPage onLoginSuccess={handleUserChange} />;
  }

  // Once Logged in, render EMS System for that role!
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
      {/* Top Navigation Bar */}
      <Navbar
        currentUser={currentUser}
        onUserChange={handleUserChange}
        onOpenAiKeyClick={() => setIsOpenAiKeyModalOpen(true)}
        onOpenAiAssistant={() => setIsAiAssistantOpen(true)}
      />

      {/* Main Workspace Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar Navigation */}
        <Sidebar
          userRole={currentUser.role}
          activeTab={activeTab}
          onTabChange={setActiveTab}
        />

        {/* Content Body */}
        <main className="flex-1 p-6 lg:p-8 overflow-y-auto max-w-7xl mx-auto w-full">
          {activeTab === 'dashboard' && (
            <DashboardPage currentUser={currentUser} onNavigate={setActiveTab} />
          )}
          {activeTab === 'profile' && <ProfilePage currentUser={currentUser} onUpdateUser={setCurrentUser} />}
          {activeTab === 'employees' && <EmployeesPage />}
          {activeTab === 'create-employee' && <CreateEmployeePage />}
          {activeTab === 'courses' && (
            <CoursesPage onNavigateToQuiz={() => setActiveTab('quizzes')} />
          )}
          {activeTab === 'quizzes' && (
            <QuizzesPage 
              currentUser={currentUser} 
              onNavigateToCertificates={() => setActiveTab('certificates')}
              onNavigateToCourses={() => setActiveTab('courses')}
            />
          )}
          {activeTab === 'certificates' && <CertificatesPage currentUser={currentUser} />}
          {activeTab === 'manager-quiz-creator' && <ManagerQuizCreatorPage />}
          {activeTab === 'shift-register' && (
            <StaffShiftRegisterPage 
              currentUser={currentUser} 
              onNavigateToSchedule={() => setActiveTab('shift-view')} 
            />
          )}
          {activeTab === 'shift-view' && <StaffShiftViewPage currentUser={currentUser} />}
          {activeTab === 'attendance' && (
            <AttendancePage 
              currentUser={currentUser} 
              onUpdateUser={setCurrentUser} 
              onNavigateTab={setActiveTab} 
            />
          )}
          {activeTab === 'attendance-exceptions' && (
            <AttendanceExceptionsPage 
              currentUser={currentUser} 
              onNavigateTab={setActiveTab} 
            />
          )}
          {/* Fallback to DashboardPage if activeTab is not recognized to prevent blank white screen */}
          {![
            'dashboard', 'profile', 'employees', 'create-employee', 
            'courses', 'quizzes', 'certificates', 'manager-quiz-creator', 
            'shift-register', 'shift-view', 'manager-scheduler', 
            'attendance', 'attendance-exceptions'
          ].includes(activeTab) && (
            <DashboardPage currentUser={currentUser} onNavigate={setActiveTab} />
          )}
        </main>
      </div>

      {/* Modals */}
      <OpenAiKeyModal
        isOpen={isOpenAiKeyModalOpen}
        onClose={() => setIsOpenAiKeyModalOpen(false)}
      />

      <AiAssistantModal
        isOpen={isAiAssistantOpen}
        onClose={() => setIsAiAssistantOpen(false)}
        onOpenKeyModal={() => setIsOpenAiKeyModalOpen(true)}
        userRole={currentUser.role}
        userId={currentUser.id}
        userName={currentUser.name}
        onNavigateTab={(tab) => {
          const isManager = currentUser.role === 'manager';
          let target: NavTab = 'dashboard';

          switch (tab) {
            case 'dashboard':
            case 'profile':
            case 'courses':
            case 'quizzes':
            case 'certificates':
            case 'shift-register':
            case 'shift-view':
            case 'employees':
            case 'create-employee':
            case 'manager-scheduler':
            case 'attendance':
            case 'attendance-exceptions':
            case 'manager-quiz-creator':
              target = tab as NavTab;
              break;
            case 'shifts':
            case 'shift':
              target = isManager ? 'manager-scheduler' : 'shift-register';
              break;
            case 'schedule':
              target = isManager ? 'manager-scheduler' : 'shift-view';
              break;
            case 'timesheet':
            case 'timekeeping':
              target = 'attendance';
              break;
            case 'course':
              target = 'courses';
              break;
            case 'quiz':
              target = 'quizzes';
              break;
            case 'certificate':
            case 'certs':
              target = 'certificates';
              break;
            default:
              target = 'dashboard';
              break;
          }

          setActiveTab(target);
          setIsAiAssistantOpen(false);
        }}
      />
    </div>
  );
}

export default App;

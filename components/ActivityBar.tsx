import React from 'react';
import { Files, GitGraph, Rocket, Search, LogOut, UserCircle, Terminal as TerminalIcon, Mail, Youtube } from 'lucide-react';
import styled from 'styled-components';
import { SidebarView } from '../types';

interface ActivityBarProps {
  activeView: SidebarView;
  onViewChange: (view: SidebarView) => void;
  changesCount?: number;
  onLogout: () => void;
  onOpenProfile: () => void;
  username: string;
}

// -- Styled Components --

const BarContainer = styled.div`
  width: 3rem;
  background-color: #333333;
  border-right: 1px solid #111827; /* gray-900 */
  display: flex;
  flex-direction: column;
  align-items: center;
  padding-top: 1rem;
  padding-bottom: 1rem;
  gap: 1rem;
  z-index: 20;
  height: 100%;
  justify-content: space-between;
`;

const TopActions = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
`;

const NavButton = styled.button<{ $isActive: boolean; $isTerminal?: boolean }>`
  padding: 0.5rem;
  border-radius: 0.5rem;
  transition: all 150ms ease-in-out;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;

  /* Dynamic Styling based on Props */
  ${props => props.$isTerminal ? `
    color: ${props.$isActive ? '#4ade80' : '#6b7280'};
    background-color: ${props.$isActive ? 'rgba(20, 83, 45, 0.2)' : 'transparent'};
    
    &:hover {
      color: #4ade80; /* green-400 */
    }
  ` : `
    color: ${props.$isActive ? 'white' : '#6b7280'};
    background-color: ${props.$isActive ? 'rgba(255, 255, 255, 0.1)' : 'transparent'};
    
    &:hover {
      color: ${props.$isActive ? 'white' : '#d1d5db'};
    }
  `}
`;

const Badge = styled.div`
  position: absolute;
  top: -0.25rem;
  right: -0.25rem;
  width: 1rem;
  height: 1rem;
  background-color: #2563eb; /* blue-600 */
  color: white;
  font-size: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 9999px;
  font-weight: bold;
`;

const Divider = styled.div`
  width: 2rem;
  height: 1px;
  background-color: #374151; /* gray-700 */
  margin: 0.25rem 0;
`;

const AvatarCircle = styled.div`
  width: 2rem;
  height: 2rem;
  border-radius: 9999px;
  background-color: #2563eb;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.75rem;
  font-weight: bold;
  cursor: default;
  user-select: none;
`;

// -- Component --

const ActivityBar: React.FC<ActivityBarProps> = ({ activeView, onViewChange, changesCount = 0, onLogout, onOpenProfile, username }) => {
  return (
    <BarContainer>
      <TopActions>
        <NavButton
          $isActive={activeView === 'explorer'}
          onClick={() => onViewChange('explorer')}
          title="Explorer"
        >
          <Files size={24} strokeWidth={1.5} />
        </NavButton>

        <NavButton
          $isActive={activeView === 'search'}
          onClick={() => onViewChange('search')}
          title="Search"
        >
          <Search size={24} strokeWidth={1.5} />
        </NavButton>

        <NavButton
          $isActive={activeView === 'git'}
          onClick={() => onViewChange('git')}
          title="Source Control"
        >
          <GitGraph size={24} strokeWidth={1.5} />
          {changesCount > 0 && <Badge>{changesCount}</Badge>}
        </NavButton>

        <NavButton
          $isActive={activeView === 'deploy'}
          onClick={() => onViewChange('deploy')}
          title="Deploy"
        >
          <Rocket size={24} strokeWidth={1.5} />
        </NavButton>

        <NavButton
          $isActive={activeView === 'courses'}
          onClick={() => onViewChange('courses')}
          title="Courses"
        >
          <Youtube size={24} strokeWidth={1.5} />
        </NavButton>

        <NavButton
          $isActive={activeView === 'contact'}
          onClick={() => onViewChange('contact')}
          title="Contact Us"
        >
          <Mail size={24} strokeWidth={1.5} />
        </NavButton>

        <NavButton
          $isActive={activeView === 'profile'}
          onClick={() => onViewChange('profile')}
          title="User Profile"
        >
          <UserCircle size={24} strokeWidth={1.5} />
        </NavButton>

        <Divider />

        <NavButton
          $isActive={activeView === 'terminal'}
          $isTerminal={true}
          onClick={() => onViewChange('terminal')}
          title="Terminal OS"
        >
          <TerminalIcon size={24} strokeWidth={1.5} />
        </NavButton>
      </TopActions>

      <div className="flex flex-col items-center gap-4 mb-2">
         <div className="group relative flex justify-center">
            <AvatarCircle>
                {username.slice(0, 2).toUpperCase()}
            </AvatarCircle>
            
            {/* Hover Tooltip/Menu (Keep Tailwind for simple absolute positioning overlay) */}
            <div className="absolute left-10 bottom-0 bg-[#252526] border border-gray-700 rounded shadow-xl p-2 min-w-[140px] opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto transition-opacity z-50">
               <div className="text-xs text-gray-400 mb-2 px-2">Logged as <span className="text-white font-bold">{username}</span></div>
               <div className="w-full h-px bg-gray-700 my-1"></div>
               <button 
                 onClick={onOpenProfile}
                 className="flex items-center gap-2 text-gray-300 hover:bg-white/5 w-full p-2 rounded text-xs transition-colors mb-1"
               >
                   <UserCircle size={14} /> My Account
               </button>
               <button 
                 onClick={onLogout}
                 className="flex items-center gap-2 text-red-400 hover:bg-white/5 w-full p-2 rounded text-xs transition-colors"
               >
                   <LogOut size={14} /> Sign Out
               </button>
            </div>
         </div>
      </div>
    </BarContainer>
  );
};

export default ActivityBar;
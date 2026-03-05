"use client";
import React, { useState } from "react";
import { motion } from "motion/react";
import { cn } from "../../../lib/utils";

interface Links {
  label: string;
  href: string;
  icon: React.JSX.Element | React.ReactNode;
  onClick?: () => void;
}

interface SidebarContextProps {
  open: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
  animate: boolean;
}

const SidebarContext = React.createContext<SidebarContextProps | undefined>(
  undefined
);

export const useSidebar = () => {
  const context = React.useContext(SidebarContext);
  if (!context) {
    throw new Error("useSidebar must be used within a SidebarProvider");
  }
  return context;
};

export const SidebarProvider = ({
  children,
  open: openProp,
  setOpen: setOpenProp,
  animate = true,
}: {
  children: React.ReactNode;
  open?: boolean;
  setOpen?: React.Dispatch<React.SetStateAction<boolean>>;
  animate?: boolean;
}) => {
  const [openState, setOpenState] = useState(false);

  const open = openProp !== undefined ? openProp : openState;
  const setOpen = setOpenProp !== undefined ? setOpenProp : setOpenState;

  return (
    <SidebarContext.Provider value={{ open, setOpen, animate }}>
      {children}
    </SidebarContext.Provider>
  );
};

export const Sidebar = ({
  children,
  open,
  setOpen,
  animate,
}: {
  children: React.ReactNode;
  open?: boolean;
  setOpen?: React.Dispatch<React.SetStateAction<boolean>>;
  animate?: boolean;
}) => {
  return (
    <SidebarProvider open={open} setOpen={setOpen} animate={animate}>
      {children}
    </SidebarProvider>
  );
};

export const SidebarBody = (props: React.ComponentProps<typeof motion.div>) => {
  return (
    <>
      <DesktopSidebar {...props} />
      <MobileSidebar {...(props as React.ComponentProps<"div">)} />
    </>
  );
};

export const DesktopSidebar = ({
  className,
  children,
  ...props
}: React.ComponentProps<typeof motion.div>) => {
  const { open, setOpen, animate } = useSidebar();
  return (
    <>
      <motion.div
        className={cn(
          "hidden h-full w-[300px] flex-shrink-0 bg-[#0b1120]/90 backdrop-blur-xl border-r border-slate-700/50 px-4 py-6 md:flex md:flex-col shadow-xl",
          className
        )}
        animate={{
          width: animate ? (open ? "300px" : "70px") : "300px",
        }}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        {...props}
      >
        {children}
      </motion.div>
    </>
  );
};

export const MobileSidebar = ({
  className,
  children,
  ...props
}: React.ComponentProps<"div">) => {
  const { open, setOpen } = useSidebar();
  return (
    <>
      <div
        className={cn(
          "flex h-10 w-full flex-row items-center justify-between bg-[#0b1120]/90 backdrop-blur-xl border-b border-slate-700/50 px-4 py-4 md:hidden"
        )}
        {...props}
      >
        <div className="z-20 flex w-full justify-end">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            className="h-6 w-6 text-slate-300"
            onClick={() => setOpen(!open)}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5"
            />
          </svg>
        </div>
        {open && (
          <motion.div
            initial={{ x: "-100%", opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: "-100%", opacity: 0 }}
            transition={{
              duration: 0.3,
              ease: "easeInOut",
            }}
            className={cn(
              "fixed inset-0 z-[100] flex h-full w-full flex-col justify-between bg-[#0b1120] backdrop-blur-xl p-10",
              className
            )}
          >
            <div
              className="absolute top-10 right-10 z-50 text-slate-300"
              onClick={() => setOpen(!open)}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="h-6 w-6"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </div>
            {children}
          </motion.div>
        )}
      </div>
    </>
  );
};

export const SidebarLink = ({
  link,
  className,
  active = false,
  ...props
}: {
  link: Links;
  className?: string;
  active?: boolean;
  props?: React.AnchorHTMLAttributes<HTMLAnchorElement>;
}) => {
  const { open, animate } = useSidebar();
  return (
    <a
      href={link.href}
      className={cn(
        "group/sidebar flex items-center py-3 rounded-xl transition-all duration-200 relative w-full",
        open || !animate ? "gap-3 px-3" : "justify-center px-1",
        active 
          ? "bg-cyan-500/15 border border-cyan-500/30 text-cyan-300" 
          : "hover:bg-purple-500/15 hover:border-purple-500/20 hover:text-purple-200 text-slate-300",
        className
      )}
      onClick={(e) => {
        if (link.onClick) {
          e.preventDefault();
          link.onClick();
        }
      }}
      {...props}
    >
      <div className={cn(
        "transition-colors shrink-0 flex items-center justify-center",
        active ? "text-cyan-400" : "text-slate-500 group-hover/sidebar:text-slate-300"
      )}>
        {link.icon}
      </div>

      <motion.span
        animate={{
          display: animate ? (open ? "inline-block" : "none") : "inline-block",
          opacity: animate ? (open ? 1 : 0) : 1,
        }}
        className={cn(
          "!m-0 inline-block whitespace-nowrap text-sm font-medium transition duration-150 overflow-hidden",
          active 
            ? "text-cyan-300" 
            : "text-slate-300"
        )}
      >
        {link.label}
      </motion.span>
    </a>
  );
};

"use client";

import React from "react";
import { Plus } from "lucide-react";

export interface TemplateCardVisualProps {
  templateId: "blank" | "proposal" | "meeting-notes" | "software-spec" | "resume" | "weekly-report" | string;
}

export default function TemplateCardVisual({ templateId }: TemplateCardVisualProps) {
  switch (templateId) {
    case "blank":
      return (
        <div className="w-full h-full bg-white dark:bg-[#1a1c20] p-3 sm:p-3.5 flex flex-col justify-between select-none relative overflow-hidden transition-colors text-slate-800 dark:text-slate-200 font-sans">
          {/* Subtle Google Docs ruler tick guide */}
          <div className="border-b border-slate-200/80 dark:border-slate-800 pb-1 flex justify-between px-1 text-[6.5px] font-mono text-slate-400 dark:text-slate-600 select-none">
            <span>| 1</span>
            <span>| 2</span>
            <span>| 3</span>
            <span>| 4</span>
            <span>| 5</span>
          </div>

          {/* Clean Google Docs empty canvas with page margin guides */}
          <div className="border border-dashed border-slate-200 dark:border-slate-800 rounded-sm flex-1 my-2 flex flex-col items-center justify-center p-2 relative bg-slate-50/40 dark:bg-[#151619]/40">
            {/* Corner margin markers */}
            <div className="absolute top-1 left-1 w-1.5 h-1.5 border-t border-l border-slate-300 dark:border-slate-600" />
            <div className="absolute top-1 right-1 w-1.5 h-1.5 border-t border-r border-slate-300 dark:border-slate-600" />
            <div className="absolute bottom-1 left-1 w-1.5 h-1.5 border-b border-l border-slate-300 dark:border-slate-600" />
            <div className="absolute bottom-1 right-1 w-1.5 h-1.5 border-b border-r border-slate-300 dark:border-slate-600" />

            {/* Minimalist Google Docs plus emblem */}
            <div className="w-9 h-9 rounded-2xl bg-white dark:bg-[#22242a] border border-slate-200 dark:border-slate-700 shadow-2xs flex items-center justify-center text-slate-700 dark:text-slate-200 group-hover:scale-110 transition-all">
              <Plus className="w-4 h-4 stroke-[2.2]" />
            </div>

            {/* Subtle cursor line simulation */}
            <div className="flex items-center gap-1 mt-2.5 opacity-70">
              <span className="w-1 h-3 bg-slate-900 dark:bg-slate-100 animate-pulse rounded-[1px]" />
              <span className="text-[8.5px] font-medium text-slate-400 dark:text-slate-500">
                Empty canvas
              </span>
            </div>
          </div>

          {/* Page footer */}
          <div className="flex items-center justify-between text-[6.5px] text-slate-400 dark:text-slate-600 pt-0.5 border-t border-slate-200/80 dark:border-slate-800">
            <span>Google Docs format</span>
            <span>Page 1 of 1</span>
          </div>
        </div>
      );

    case "proposal":
      return (
        <div className="w-full h-full bg-white dark:bg-[#1a1c20] p-3 sm:p-3.5 flex flex-col justify-between select-none relative overflow-hidden transition-colors text-slate-900 dark:text-slate-100 font-sans">
          <div>
            {/* Clean Black & White Document Title & Metadata */}
            <div className="leading-tight">
              <div className="text-[8.5px] font-black uppercase tracking-wider text-slate-950 dark:text-white">
                PROJECT PROPOSAL
              </div>
              <div className="text-[7px] font-bold text-slate-800 dark:text-slate-200 mt-0.5">
                Enterprise Cloud Workspace
              </div>
              <div className="text-[5.5px] text-slate-500 dark:text-slate-400 mt-0.5">
                Prepared for: Global Operations Board &bull; October 2026
              </div>
            </div>

            {/* Crisp Hairline Divider */}
            <div className="w-full h-px bg-slate-300 dark:bg-slate-700 my-1.5" />

            {/* 1. Executive Summary */}
            <div>
              <div className="text-[6.5px] font-bold text-slate-900 dark:text-slate-100">
                1. Executive Summary
              </div>
              <div className="space-y-0.5 mt-0.5">
                <div className="h-0.5 w-full bg-slate-300 dark:bg-slate-700 rounded-full" />
                <div className="h-0.5 w-11/12 bg-slate-300 dark:bg-slate-700 rounded-full" />
                <div className="h-0.5 w-4/5 bg-slate-300 dark:bg-slate-700 rounded-full" />
              </div>
            </div>

            {/* 2. Strategic Objectives */}
            <div className="mt-1.5">
              <div className="text-[6.5px] font-bold text-slate-900 dark:text-slate-100">
                2. Strategic Objectives
              </div>
              <div className="space-y-0.5 mt-0.5 text-[5.5px] text-slate-600 dark:text-slate-400">
                <div className="flex items-center gap-1">
                  <span className="w-0.5 h-0.5 rounded-full bg-slate-800 dark:bg-slate-300 shrink-0" />
                  <span className="truncate">Sub-second synchronization &amp; autosave</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="w-0.5 h-0.5 rounded-full bg-slate-800 dark:bg-slate-300 shrink-0" />
                  <span className="truncate">Enterprise RBAC access control</span>
                </div>
              </div>
            </div>

            {/* 3. Implementation Roadmap Table */}
            <div className="mt-1.5">
              <div className="text-[6.5px] font-bold text-slate-900 dark:text-slate-100 mb-0.5">
                3. Key Milestones &amp; Roadmap
              </div>
              <div className="border border-slate-300 dark:border-slate-700 rounded-[2px] overflow-hidden text-[5px]">
                <div className="bg-slate-100 dark:bg-slate-800 px-1 py-0.5 flex justify-between font-bold text-slate-900 dark:text-slate-100 border-b border-slate-300 dark:border-slate-700">
                  <span>Phase</span>
                  <span>Deliverable</span>
                  <span>Status</span>
                </div>
                <div className="px-1 py-0.5 flex justify-between items-center border-b border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300">
                  <span className="font-semibold">Phase 1</span>
                  <span className="truncate max-w-[55px]">Core Canvas</span>
                  <span className="font-semibold text-slate-900 dark:text-white">Done</span>
                </div>
                <div className="px-1 py-0.5 flex justify-between items-center border-b border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300">
                  <span className="font-semibold">Phase 2</span>
                  <span className="truncate max-w-[55px]">RBAC Permissions</span>
                  <span className="font-semibold text-slate-900 dark:text-white">Done</span>
                </div>
                <div className="px-1 py-0.5 flex justify-between items-center text-slate-700 dark:text-slate-300">
                  <span className="font-semibold">Phase 3</span>
                  <span className="truncate max-w-[55px]">Template Hardening</span>
                  <span className="font-semibold text-slate-900 dark:text-white">Active</span>
                </div>
              </div>
            </div>

            {/* Blockquote with subtle black/slate border */}
            <div className="mt-1.5 pl-1.5 border-l-2 border-slate-800 dark:border-slate-300 py-0.5 text-[5px] italic text-slate-600 dark:text-slate-400">
              &ldquo;Investing in reliable infrastructure delivers compounding velocity.&rdquo;
            </div>
          </div>

          {/* Document Sign-off Footer */}
          <div className="pt-1 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-[5.5px] text-slate-500 dark:text-slate-400">
            <span>Sign-off: Alice Vance &bull; VP Eng</span>
            <span className="font-semibold text-slate-900 dark:text-slate-200">Approved</span>
          </div>
        </div>
      );

    case "meeting-notes":
      return (
        <div className="w-full h-full bg-white dark:bg-[#1a1c20] p-3 sm:p-3.5 flex flex-col justify-between select-none relative overflow-hidden transition-colors text-slate-900 dark:text-slate-100 font-sans">
          <div>
            {/* Clean Document Header */}
            <div className="leading-tight">
              <div className="text-[8.5px] font-black uppercase tracking-wider text-slate-950 dark:text-white">
                TEAM SPRINT SYNC
              </div>
              <div className="text-[7px] font-bold text-slate-800 dark:text-slate-200 mt-0.5">
                Product Engineering &amp; Architecture
              </div>
              <div className="text-[5.5px] text-slate-500 dark:text-slate-400 mt-0.5">
                Oct 14, 2026 &bull; 10:00 AM EST &bull; Room 402 / Virtual
              </div>
              <div className="text-[5.5px] text-slate-600 dark:text-slate-300 mt-0.5">
                <strong>Attendees:</strong> Alice Vance (Lead), Bob Smith, Charlie Day
              </div>
            </div>

            {/* Crisp Hairline Divider */}
            <div className="w-full h-px bg-slate-300 dark:bg-slate-700 my-1.5" />

            {/* 1. Meeting Agenda */}
            <div>
              <div className="text-[6.5px] font-bold text-slate-900 dark:text-slate-100">
                1. Meeting Agenda
              </div>
              <div className="space-y-0.5 mt-0.5 text-[5.5px] text-slate-600 dark:text-slate-400">
                <div className="flex items-center gap-1">
                  <span className="font-bold text-slate-900 dark:text-slate-100">1.</span>
                  <span className="truncate">Review quarterly benchmarks &amp; save telemetry</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="font-bold text-slate-900 dark:text-slate-100">2.</span>
                  <span className="truncate">Google Docs inspired UI/UX canvas sheet overhaul</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="font-bold text-slate-900 dark:text-slate-100">3.</span>
                  <span className="truncate">Security boundaries and RBAC policy audit</span>
                </div>
              </div>
            </div>

            {/* 2. Action Items Table */}
            <div className="mt-1.5">
              <div className="text-[6.5px] font-bold text-slate-900 dark:text-slate-100 mb-0.5">
                3. Action Items &amp; Ownership
              </div>
              <div className="border border-slate-300 dark:border-slate-700 rounded-[2px] overflow-hidden text-[5px]">
                <div className="bg-slate-100 dark:bg-slate-800 px-1 py-0.5 flex justify-between font-bold text-slate-900 dark:text-slate-100 border-b border-slate-300 dark:border-slate-700">
                  <span>Action Item</span>
                  <span>Owner</span>
                  <span>Due</span>
                </div>
                <div className="px-1 py-0.5 flex justify-between items-center border-b border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300">
                  <span className="truncate max-w-[55px]">Template Previews</span>
                  <span className="font-semibold text-slate-900 dark:text-white">Alice Vance</span>
                  <span>Oct 18</span>
                </div>
                <div className="px-1 py-0.5 flex justify-between items-center border-b border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300">
                  <span className="truncate max-w-[55px]">Mobile Viewports</span>
                  <span className="font-semibold text-slate-900 dark:text-white">Bob Smith</span>
                  <span>Oct 20</span>
                </div>
                <div className="px-1 py-0.5 flex justify-between items-center text-slate-700 dark:text-slate-300">
                  <span className="truncate max-w-[55px]">RBAC Pen Tests</span>
                  <span className="font-semibold text-slate-900 dark:text-white">Charlie Day</span>
                  <span>Oct 22</span>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="pt-1 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-[5.5px] text-slate-500 dark:text-slate-400">
            <span>Sprint 42 Sync Notes</span>
            <span>Next: Oct 21, 10:00 AM</span>
          </div>
        </div>
      );

    case "software-spec":
      return (
        <div className="w-full h-full bg-white dark:bg-[#1a1c20] p-3 sm:p-3.5 flex flex-col justify-between select-none relative overflow-hidden transition-colors text-slate-900 dark:text-slate-100 font-sans">
          <div>
            {/* Clean Technical Document Header */}
            <div className="leading-tight">
              <div className="text-[8px] font-black uppercase tracking-wider text-slate-950 dark:text-white">
                SYSTEM ARCHITECTURE SPEC
              </div>
              <div className="text-[7px] font-bold text-slate-800 dark:text-slate-200 mt-0.5">
                Ajaia Collaborative Docs Engine
              </div>
              <div className="text-[5.5px] text-slate-500 dark:text-slate-400 mt-0.5">
                SPEC-2026-ENG-04 &bull; Version 2.0 &bull; Status: Approved
              </div>
              <div className="text-[5.5px] text-slate-500 dark:text-slate-400">
                Principal Architect: Alex Mercer &bull; Target: Next.js + MongoDB
              </div>
            </div>

            {/* Crisp Hairline Divider */}
            <div className="w-full h-px bg-slate-300 dark:bg-slate-700 my-1.5" />

            {/* 1. Architecture Overview */}
            <div>
              <div className="text-[6.5px] font-bold text-slate-900 dark:text-slate-100">
                1. High-Level Architecture
              </div>
              <div className="space-y-0.5 mt-0.5">
                <div className="h-0.5 w-full bg-slate-300 dark:bg-slate-700 rounded-full" />
                <div className="h-0.5 w-5/6 bg-slate-300 dark:bg-slate-700 rounded-full" />
              </div>
            </div>

            {/* 2. Core Data Models Code Box */}
            <div className="mt-1.5">
              <div className="text-[6.5px] font-bold text-slate-900 dark:text-slate-100 mb-0.5">
                2. Core Data Models (IDocument)
              </div>
              <div className="bg-slate-50 dark:bg-[#121316] border border-slate-300 dark:border-slate-700 rounded-[2px] p-1 font-mono text-[5px] text-slate-800 dark:text-slate-200 leading-tight">
                <div>
                  <span className="font-bold">interface</span> IDocument &#123;
                </div>
                <div className="pl-1">_id: ObjectId;</div>
                <div className="pl-1">title: string;</div>
                <div className="pl-1">content: string; // TipTap HTML</div>
                <div className="pl-1">ownerId: string;</div>
                <div className="pl-1">sharedWith: string[];</div>
                <div>&#125;</div>
              </div>
            </div>

            {/* 3. API Contract Endpoints */}
            <div className="mt-1.5">
              <div className="text-[6.5px] font-bold text-slate-900 dark:text-slate-100 mb-0.5">
                4. API Endpoints Contract
              </div>
              <div className="border border-slate-300 dark:border-slate-700 rounded-[2px] overflow-hidden text-[5px] font-mono">
                <div className="bg-slate-100 dark:bg-slate-800 px-1 py-0.5 flex justify-between font-bold text-slate-900 dark:text-slate-100 border-b border-slate-300 dark:border-slate-700">
                  <span>Endpoint</span>
                  <span>Method</span>
                  <span>Scope</span>
                </div>
                <div className="px-1 py-0.5 flex justify-between items-center border-b border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300">
                  <span>/api/documents</span>
                  <span className="font-bold">GET/POST</span>
                  <span>Auth</span>
                </div>
                <div className="px-1 py-0.5 flex justify-between items-center text-slate-700 dark:text-slate-300">
                  <span>/api/documents/[id]</span>
                  <span className="font-bold">GET/PUT</span>
                  <span>Owner</span>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="pt-1 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-[5.5px] font-mono text-slate-500 dark:text-slate-400">
            <span>Next.js &bull; MongoDB</span>
            <span className="font-bold text-slate-900 dark:text-white">Strict RBAC</span>
          </div>
        </div>
      );

    case "resume":
      return (
        <div className="w-full h-full bg-white dark:bg-[#1a1c20] p-3 sm:p-3.5 flex flex-col justify-between select-none relative overflow-hidden transition-colors text-slate-900 dark:text-slate-100 font-sans">
          <div>
            {/* Top-Class Black & White Executive CV Header */}
            <div className="text-center pb-1">
              <div className="text-[10px] font-black uppercase tracking-wider text-slate-950 dark:text-white">
                ALEX MERCER
              </div>
              <div className="text-[6.5px] font-semibold text-slate-700 dark:text-slate-300 mt-0.5">
                Lead Full-Stack Architect &amp; Engineering Manager
              </div>
              <div className="text-[5.5px] text-slate-500 dark:text-slate-400 mt-0.5">
                San Francisco, CA &bull; alex.mercer@example.com &bull; +1 (555) 019-2834
              </div>
            </div>

            {/* Crisp Hairline Divider */}
            <div className="w-full h-px bg-slate-300 dark:bg-slate-700 my-1" />

            {/* Professional Summary */}
            <div>
              <div className="text-[6px] font-black uppercase tracking-wider text-slate-900 dark:text-slate-100">
                PROFESSIONAL SUMMARY
              </div>
              <div className="space-y-0.5 mt-0.5">
                <div className="h-0.5 w-full bg-slate-300 dark:bg-slate-700 rounded-full" />
                <div className="h-0.5 w-11/12 bg-slate-300 dark:bg-slate-700 rounded-full" />
              </div>
            </div>

            {/* Core Competencies */}
            <div className="mt-1">
              <div className="text-[6px] font-black uppercase tracking-wider text-slate-900 dark:text-slate-100">
                CORE COMPETENCIES &amp; SKILLS
              </div>
              <div className="text-[5.5px] text-slate-700 dark:text-slate-300 mt-0.5 space-y-0.5">
                <div className="truncate">
                  <strong>Languages:</strong> TypeScript, React, Next.js, Node.js, Python, TipTap
                </div>
                <div className="truncate">
                  <strong>Systems:</strong> MongoDB, Redis, Docker, Kubernetes, AWS, RBAC Security
                </div>
              </div>
            </div>

            {/* Professional Experience */}
            <div className="mt-1">
              <div className="text-[6px] font-black uppercase tracking-wider text-slate-900 dark:text-slate-100">
                PROFESSIONAL EXPERIENCE
              </div>
              <div className="space-y-1 mt-0.5">
                <div>
                  <div className="flex items-center justify-between text-[5.5px]">
                    <span className="font-bold text-slate-900 dark:text-slate-100">
                      Principal Software Architect &bull; CloudFlow
                    </span>
                    <span className="text-slate-500">2022 &ndash; Present</span>
                  </div>
                  <div className="space-y-0.5 mt-0.5 text-[5px] text-slate-600 dark:text-slate-400">
                    <div className="truncate">&bull; Architected real-time docs engine for 450,000+ users</div>
                    <div className="truncate">&bull; Reduced save latency by 68% via debounced sync</div>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between text-[5.5px]">
                    <span className="font-bold text-slate-900 dark:text-slate-100">
                      Senior Full-Stack Engineer &bull; Horizon Labs
                    </span>
                    <span className="text-slate-500">2019 &ndash; 2022</span>
                  </div>
                  <div className="space-y-0.5 mt-0.5 text-[5px] text-slate-600 dark:text-slate-400">
                    <div className="truncate">&bull; Built collaborative editing canvas with live markdown</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Education */}
            <div className="mt-1">
              <div className="text-[6px] font-black uppercase tracking-wider text-slate-900 dark:text-slate-100">
                EDUCATION &amp; CREDENTIALS
              </div>
              <div className="text-[5.5px] text-slate-700 dark:text-slate-300 mt-0.5">
                <strong>B.S. in Computer Science</strong> &bull; Stanford University (2015 &ndash; 2019)
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="pt-1 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-[5.5px] text-slate-500 dark:text-slate-400">
            <span>Alex Mercer &bull; Curriculum Vitae</span>
            <span>Page 1 of 1</span>
          </div>
        </div>
      );

    case "weekly-report":
      return (
        <div className="w-full h-full bg-white dark:bg-[#1a1c20] p-3 sm:p-3.5 flex flex-col justify-between select-none relative overflow-hidden transition-colors text-slate-900 dark:text-slate-100 font-sans">
          <div>
            {/* Clean Document Header */}
            <div className="leading-tight">
              <div className="text-[8.5px] font-black uppercase tracking-wider text-slate-950 dark:text-white">
                WEEKLY STATUS REPORT
              </div>
              <div className="text-[7px] font-bold text-slate-800 dark:text-slate-200 mt-0.5">
                Product Engineering Team
              </div>
              <div className="text-[5.5px] text-slate-500 dark:text-slate-400 mt-0.5">
                Period: Week 42 (Oct 13 &ndash; Oct 17, 2026) &bull; Lead: Alice Vance
              </div>
              <div className="text-[5.5px] text-slate-500 dark:text-slate-400">
                Status: On Track &bull; Zero Blocking Issues
              </div>
            </div>

            {/* Crisp Hairline Divider */}
            <div className="w-full h-px bg-slate-300 dark:bg-slate-700 my-1.5" />

            {/* 1. Key Highlights */}
            <div>
              <div className="text-[6.5px] font-bold text-slate-900 dark:text-slate-100">
                1. Executive Summary &amp; Highlights
              </div>
              <div className="space-y-0.5 mt-0.5 text-[5.5px] text-slate-600 dark:text-slate-400">
                <div className="flex items-center gap-1">
                  <span className="w-0.5 h-0.5 rounded-full bg-slate-800 dark:bg-slate-300 shrink-0" />
                  <span className="truncate">Shipped Google Docs inspired canvas &amp; template previews</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="w-0.5 h-0.5 rounded-full bg-slate-800 dark:bg-slate-300 shrink-0" />
                  <span className="truncate">Maintained 100% test pass rate across 56 test suites</span>
                </div>
              </div>
            </div>

            {/* 2. Metrics Table */}
            <div className="mt-1.5">
              <div className="text-[6.5px] font-bold text-slate-900 dark:text-slate-100 mb-0.5">
                2. Weekly Metrics Overview &amp; KPIs
              </div>
              <div className="border border-slate-300 dark:border-slate-700 rounded-[2px] overflow-hidden text-[5px]">
                <div className="bg-slate-100 dark:bg-slate-800 px-1 py-0.5 flex justify-between font-bold text-slate-900 dark:text-slate-100 border-b border-slate-300 dark:border-slate-700">
                  <span>Metric Category</span>
                  <span>Value</span>
                  <span>WoW</span>
                  <span>Target</span>
                </div>
                <div className="px-1 py-0.5 flex justify-between items-center border-b border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300">
                  <span className="truncate max-w-[50px]">Active Documents</span>
                  <span className="font-bold text-slate-900 dark:text-white">1,248</span>
                  <span>+22%</span>
                  <span>1,000+</span>
                </div>
                <div className="px-1 py-0.5 flex justify-between items-center text-slate-700 dark:text-slate-300">
                  <span className="truncate max-w-[50px]">Average Save Latency</span>
                  <span className="font-bold text-slate-900 dark:text-white">48 ms</span>
                  <span>-22.5%</span>
                  <span>&lt; 100ms</span>
                </div>
              </div>
            </div>

            {/* 3. Deliverables Table */}
            <div className="mt-1.5">
              <div className="text-[6.5px] font-bold text-slate-900 dark:text-slate-100 mb-0.5">
                3. Deliverables &amp; Milestone Tracking
              </div>
              <div className="border border-slate-300 dark:border-slate-700 rounded-[2px] overflow-hidden text-[5px]">
                <div className="bg-slate-100 dark:bg-slate-800 px-1 py-0.5 flex justify-between font-bold text-slate-900 dark:text-slate-100 border-b border-slate-300 dark:border-slate-700">
                  <span>Initiative</span>
                  <span>Owner</span>
                  <span>Status</span>
                </div>
                <div className="px-1 py-0.5 flex justify-between items-center border-b border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300">
                  <span className="truncate max-w-[50px]">Docs Canvas</span>
                  <span>Alice</span>
                  <span className="font-semibold text-slate-900 dark:text-white">Completed</span>
                </div>
                <div className="px-1 py-0.5 flex justify-between items-center text-slate-700 dark:text-slate-300">
                  <span className="truncate max-w-[50px]">Template Gallery</span>
                  <span>Bob</span>
                  <span className="font-semibold text-slate-900 dark:text-white">Completed</span>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="pt-1 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-[5.5px] text-slate-500 dark:text-slate-400">
            <span>Weekly Status Report &bull; Week 42</span>
            <span>Confidential</span>
          </div>
        </div>
      );

    default:
      return (
        <div className="w-full h-full bg-white dark:bg-[#1a1c20] p-3 flex flex-col justify-between">
          <div className="h-1.5 w-8 rounded-full bg-slate-400 mb-2" />
          <div className="h-2 w-3/4 bg-slate-200 dark:bg-slate-700 rounded mb-1.5" />
          <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded mb-1" />
          <div className="h-1.5 w-2/3 bg-slate-100 dark:bg-slate-800 rounded" />
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[9px] text-slate-400">
            <span className="font-semibold uppercase tracking-wider">Document</span>
          </div>
        </div>
      );
  }
}

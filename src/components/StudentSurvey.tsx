import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle2, AlertTriangle, HelpCircle, ArrowRight, ShieldCheck, ClipboardCheck } from 'lucide-react';
import { StudentSurvey as IStudentSurvey, SystemConfig } from '../types';

interface StudentSurveyProps {
  config: SystemConfig;
  onSurveySubmit: (survey: Omit<IStudentSurvey, 'id' | 'submittedAt'>) => void;
}

export default function StudentSurvey({ config, onSurveySubmit }: StudentSurveyProps) {
  const [formData, setFormData] = useState({
    weekEnding: '',
    courseName: '',
    center: '',
    studentName: '',
    anonymous: false,
    pace: 0,
    clarity: 0,
    keepUp: 0,
    questionsAnswered: '',
    materialsClear: 0,
    materialsOnTime: '',
    exercisesMatched: '',
    labSufficient: null as number | null,
    toolsWorked: '',
    couldComplete: '',
    hadIssue: '' as 'Yes' | 'No' | '',
    issueCategories: [] as string[],
    severity: '' as 'Low' | 'Medium' | 'High' | 'Urgent' | '',
    issueDescription: '',
    repeatIssue: '' as 'Yes' | 'No' | 'Not sure' | '',
    overallSatisfaction: 0,
    confidence: 0,
    additionalComments: ''
  });

  const [formSubmitted, setFormSubmitted] = useState(false);
  const [showErrors, setShowErrors] = useState(false);
  const [activeSection, setActiveSection] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // References for scroll-to-error behavior
  const formRef = useRef<HTMLFormElement>(null);
  const sectionRefs = {
    s1: useRef<HTMLDivElement>(null),
    s2: useRef<HTMLDivElement>(null),
    s3: useRef<HTMLDivElement>(null),
    s4: useRef<HTMLDivElement>(null),
    s5: useRef<HTMLDivElement>(null),
    s6: useRef<HTMLDivElement>(null)
  };

  // Define required fields and assess filling
  const getRequiredFieldsStatus = () => {
    return {
      weekEnding: !!formData.weekEnding,
      courseName: !!formData.courseName,
      center: !!formData.center,
      pace: formData.pace > 0,
      clarity: formData.clarity > 0,
      keepUp: formData.keepUp > 0,
      questionsAnswered: !!formData.questionsAnswered,
      materialsClear: formData.materialsClear > 0,
      materialsOnTime: !!formData.materialsOnTime,
      exercisesMatched: !!formData.exercisesMatched,
      hadIssue: !!formData.hadIssue,
      overallSatisfaction: formData.overallSatisfaction > 0,
      confidence: formData.confidence > 0
    };
  };

  const status = getRequiredFieldsStatus();
  const requiredKeys = Object.keys(status) as Array<keyof typeof status>;
  const filledCount = requiredKeys.filter((k) => status[k]).length;
  const progressPercent = Math.round((filledCount / requiredKeys.length) * 100);

  // Intersection observer to track current visible section
  useEffect(() => {
    const observers = Object.entries(sectionRefs).map(([key, ref]) => {
      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            const secNum = parseInt(key.replace('s', ''));
            setActiveSection(secNum);
          }
        },
        { rootMargin: '-40% 0px -50% 0px' }
      );
      if (ref.current) observer.observe(ref.current);
      return { observer, element: ref.current };
    });

    return () => {
      observers.forEach(({ observer, element }) => {
        if (element) observer.unobserve(element);
      });
    };
  }, []);

  const handlePillSelect = (field: keyof typeof formData, val: any) => {
    setFormData((prev) => ({ ...prev, [field]: val }));
  };

  const handleCheckboxToggle = (category: string) => {
    setFormData((prev) => {
      const exists = prev.issueCategories.includes(category);
      const updated = exists
        ? prev.issueCategories.filter((c) => c !== category)
        : [...prev.issueCategories, category];
      return { ...prev, issueCategories: updated };
    });
  };

  const validateForm = () => {
    const invalidFields = requiredKeys.filter((k) => !status[k]);
    if (invalidFields.length > 0) {
      setShowErrors(true);
      // Determine which section the first error is in and scroll to it
      let targetRef: React.RefObject<HTMLDivElement | null> | null = null;
      if (!status.weekEnding || !status.courseName || !status.center) {
        targetRef = sectionRefs.s1;
      } else if (!status.pace || !status.clarity || !status.keepUp || !status.questionsAnswered) {
        targetRef = sectionRefs.s2;
      } else if (!status.materialsClear || !status.materialsOnTime || !status.exercisesMatched) {
        targetRef = sectionRefs.s3;
      } else if (!status.hadIssue) {
        targetRef = sectionRefs.s5;
      } else if (!status.overallSatisfaction || !status.confidence) {
        targetRef = sectionRefs.s6;
      }

      if (targetRef && targetRef.current) {
        targetRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      return false;
    }
    return true;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsSubmitting(true);
    // Simulate slight network delay
    setTimeout(() => {
      onSurveySubmit({
        weekEnding: formData.weekEnding,
        courseName: formData.courseName,
        center: formData.center,
        studentName: formData.anonymous ? '' : formData.studentName,
        anonymous: formData.anonymous,
        pace: formData.pace,
        clarity: formData.clarity,
        keepUp: formData.keepUp,
        questionsAnswered: formData.questionsAnswered,
        materialsClear: formData.materialsClear,
        materialsOnTime: formData.materialsOnTime,
        exercisesMatched: formData.exercisesMatched,
        labSufficient: formData.labSufficient,
        toolsWorked: formData.toolsWorked,
        couldComplete: formData.couldComplete,
        hadIssue: formData.hadIssue as 'Yes' | 'No',
        issueCategories: formData.hadIssue === 'Yes' ? formData.issueCategories : [],
        severity: formData.hadIssue === 'Yes' ? formData.severity : '',
        issueDescription: formData.hadIssue === 'Yes' ? formData.issueDescription : '',
        repeatIssue: formData.hadIssue === 'Yes' ? formData.repeatIssue : '',
        overallSatisfaction: formData.overallSatisfaction,
        confidence: formData.confidence,
        additionalComments: formData.additionalComments
      });
      setIsSubmitting(false);
      setFormSubmitted(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }, 1200);
  };

  const resetForm = () => {
    setFormData({
      weekEnding: '',
      courseName: '',
      center: '',
      studentName: '',
      anonymous: false,
      pace: 0,
      clarity: 0,
      keepUp: 0,
      questionsAnswered: '',
      materialsClear: 0,
      materialsOnTime: '',
      exercisesMatched: '',
      labSufficient: null,
      toolsWorked: '',
      couldComplete: '',
      hadIssue: '',
      issueCategories: [],
      severity: '',
      issueDescription: '',
      repeatIssue: '',
      overallSatisfaction: 0,
      confidence: 0,
      additionalComments: ''
    });
    setFormSubmitted(false);
    setShowErrors(false);
    setActiveSection(1);
  };

  if (formSubmitted) {
    return (
      <div className="max-w-xl mx-auto py-16 px-4 text-center">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="bg-white rounded-2xl p-10 shadow-xl border border-slate-100 flex flex-col items-center"
        >
          <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center text-3xl mb-6">
            <CheckCircle2 className="w-10 h-10" />
          </div>
          <h2 className="text-2xl font-bold font-display text-slate-800 mb-3">Thank you for your feedback!</h2>
          <p className="text-slate-600 text-sm mb-8 leading-relaxed max-w-sm">
            Your response has been received. This information goes directly to the **Training Operations** team at New Horizons Computer Learning Centers to help us continuously refine and improve our classes.
          </p>
          <button
            onClick={resetForm}
            className="px-6 py-3 bg-red-500 hover:bg-red-600 text-white text-sm font-semibold rounded-lg shadow-md transition-all flex items-center gap-2"
          >
            <ClipboardCheck className="w-4 h-4" />
            Submit Another Feedback
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* Sticky top progress bar */}
      <div className="sticky top-0 z-40 bg-slate-900 text-white py-4 px-6 shadow-md border-b border-slate-800">
        <div className="max-w-3xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-red-400 font-extrabold text-sm tracking-wider uppercase font-display">New Horizons</span>
              <span className="text-slate-500 text-xs">|</span>
              <span className="text-slate-400 text-xs font-semibold">Weekly Student Pulse</span>
            </div>
            <h1 className="text-lg font-bold text-slate-100 mt-0.5">Student Weekly Survey</h1>
          </div>
          <div className="flex flex-col md:items-end gap-1.5 min-w-[200px]">
            <div className="flex justify-between w-full text-xs text-slate-400">
              <span>{progressPercent}% Complete</span>
              <span>Section {activeSection} of 6</span>
            </div>
            <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
              <div
                className="bg-red-500 h-full rounded-full transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto py-10 px-4 md:px-6">
        <p className="text-slate-600 text-sm mb-8 leading-relaxed">
          Please take 3 minutes to complete this weekly pulse survey. It helps us capture classroom concerns, lab errors, and pacing challenges early. Every response goes directly to the Training Operations team.
        </p>

        {showErrors && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3 text-red-800"
          >
            <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-bold">Please fill in required fields</p>
              <p className="text-xs text-red-600 mt-1">
                We marked missing required inputs with red borders. Scroll down to complete them.
              </p>
            </div>
          </motion.div>
        )}

        <form ref={formRef} onSubmit={handleSubmit} className="space-y-8" noValidate>
          {/* SECTION 1: Check-in Info */}
          <div
            ref={sectionRefs.s1}
            id="sec-1"
            className={`bg-white rounded-2xl border p-6 md:p-8 transition-shadow hover:shadow-md ${
              showErrors && (!formData.weekEnding || !formData.courseName || !formData.center)
                ? 'border-red-300 shadow-sm shadow-red-50'
                : 'border-slate-200'
            }`}
          >
            <div className="flex items-center gap-4 mb-6">
              <div className="w-10 h-10 rounded-full bg-slate-900 text-white font-bold text-sm flex items-center justify-center">
                1
              </div>
              <div>
                <h3 className="font-bold text-slate-900 font-display">Check-in Info</h3>
                <p className="text-slate-500 text-xs">Tell us when and where this training week took place</p>
              </div>
            </div>

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-bold text-slate-800 mb-1">
                  Week Ending <span className="text-red-500">*</span>
                </label>
                <p className="text-xs text-slate-500 mb-2">Select the date this week's classes concluded.</p>
                <input
                  type="date"
                  required
                  value={formData.weekEnding}
                  onChange={(e) => setFormData((prev) => ({ ...prev, weekEnding: e.target.value }))}
                  className={`w-full p-2.5 border rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-slate-900 ${
                    showErrors && !formData.weekEnding ? 'border-red-400 bg-red-50/20' : 'border-slate-300'
                  }`}
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-800 mb-1">
                  Course Name <span className="text-red-500">*</span>
                </label>
                <p className="text-xs text-slate-500 mb-2 font-sans">Choose the course you attended this week.</p>
                <select
                  required
                  value={formData.courseName}
                  onChange={(e) => setFormData((prev) => ({ ...prev, courseName: e.target.value }))}
                  className={`w-full p-2.5 border rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-slate-900 ${
                    showErrors && !formData.courseName ? 'border-red-400 bg-red-50/20' : 'border-slate-300'
                  }`}
                >
                  <option value="" disabled>Select a course...</option>
                  {config.courses.map((cat) => (
                    <optgroup key={cat.category} label={cat.category}>
                      {cat.items.map((item) => (
                        <option key={item} value={item}>
                          {item}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-800 mb-1">
                  Center Location <span className="text-red-500">*</span>
                </label>
                <p className="text-xs text-slate-500 mb-2">Select the center where your training took place.</p>
                <select
                  required
                  value={formData.center}
                  onChange={(e) => setFormData((prev) => ({ ...prev, center: e.target.value }))}
                  className={`w-full p-2.5 border rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-slate-900 ${
                    showErrors && !formData.center ? 'border-red-400 bg-red-50/20' : 'border-slate-300'
                  }`}
                >
                  <option value="" disabled>Select a center...</option>
                  {config.centers.map((center) => (
                    <option key={center} value={center}>
                      {center}
                    </option>
                  ))}
                </select>
              </div>

              <div className="border-t border-slate-100 pt-6">
                <div className="flex items-start gap-3 mb-4">
                  <input
                    type="checkbox"
                    id="isAnonymous"
                    checked={formData.anonymous}
                    onChange={(e) => setFormData((prev) => ({ ...prev, anonymous: e.target.checked }))}
                    className="mt-1 w-4 h-4 rounded border-slate-300 text-red-500 focus:ring-red-500"
                  />
                  <label htmlFor="isAnonymous" className="text-sm font-semibold text-slate-700 cursor-pointer">
                    I would like this response to remain anonymous
                  </label>
                </div>

                {!formData.anonymous && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                  >
                    <label className="block text-sm font-bold text-slate-800 mb-1">
                      Student ID or Name
                    </label>
                    <p className="text-xs text-slate-500 mb-2">Enter your name or ID. Leaving anonymous unchecked is highly appreciated so we can contact you to fix any issues!</p>
                    <input
                      type="text"
                      value={formData.studentName}
                      onChange={(e) => setFormData((prev) => ({ ...prev, studentName: e.target.value }))}
                      placeholder="e.g. Adebayo Thompson"
                      className="w-full p-2.5 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-slate-900"
                    />
                  </motion.div>
                )}
              </div>
            </div>
          </div>

          {/* SECTION 2: Class Delivery */}
          <div
            ref={sectionRefs.s2}
            id="sec-2"
            className={`bg-white rounded-2xl border p-6 md:p-8 transition-shadow hover:shadow-md ${
              showErrors && (!formData.pace || !formData.clarity || !formData.keepUp || !formData.questionsAnswered)
                ? 'border-red-300 shadow-sm shadow-red-50'
                : 'border-slate-200'
            }`}
          >
            <div className="flex items-center gap-4 mb-6">
              <div className="w-10 h-10 rounded-full bg-slate-900 text-white font-bold text-sm flex items-center justify-center">
                2
              </div>
              <div>
                <h3 className="font-bold text-slate-900 font-display">Class Delivery This Week</h3>
                <p className="text-slate-500 text-xs">Pacing, clarity, and engagement factors</p>
              </div>
            </div>

            <div className="space-y-6">
              {/* Pace */}
              <div>
                <label className="block text-sm font-bold text-slate-800 mb-1">
                  The pace of this week's class was appropriate for me <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-5 gap-2 mt-3">
                  {[1, 2, 3, 4, 5].map((val) => {
                    const labels = ['Too slow', 'Somewhat slow', 'Just right', 'Somewhat fast', 'Too fast'];
                    return (
                      <button
                        key={val}
                        type="button"
                        onClick={() => handlePillSelect('pace', val)}
                        className={`py-3 px-2 border rounded-xl text-center text-xs transition-all ${
                          formData.pace === val
                            ? 'bg-slate-900 border-slate-900 text-white font-semibold'
                            : showErrors && !formData.pace
                            ? 'border-red-300 bg-red-50/10 text-slate-700 hover:bg-slate-50'
                            : 'border-slate-200 text-slate-700 bg-white hover:bg-slate-50'
                        }`}
                      >
                        <span className="block font-bold text-sm mb-1">{val}</span>
                        <span className="text-[10px] leading-tight block">{labels[val - 1]}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Clarity */}
              <div>
                <label className="block text-sm font-bold text-slate-800 mb-1">
                  The trainer explained this week's concepts clearly <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-5 gap-2 mt-3">
                  {[1, 2, 3, 4, 5].map((val) => {
                    const labels = ['Strongly Disagree', 'Disagree', 'Neutral', 'Agree', 'Strongly Agree'];
                    return (
                      <button
                        key={val}
                        type="button"
                        onClick={() => handlePillSelect('clarity', val)}
                        className={`py-3 px-1 border rounded-xl text-center text-xs transition-all ${
                          formData.clarity === val
                            ? 'bg-slate-900 border-slate-900 text-white font-semibold'
                            : showErrors && !formData.clarity
                            ? 'border-red-300 bg-red-50/10 text-slate-700 hover:bg-slate-50'
                            : 'border-slate-200 text-slate-700 bg-white hover:bg-slate-50'
                        }`}
                      >
                        <span className="block font-bold text-sm mb-1">{val}</span>
                        <span className="text-[9px] leading-tight block">{labels[val - 1]}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Keep up */}
              <div>
                <label className="block text-sm font-bold text-slate-800 mb-1">
                  I was able to keep up with the material taught this week <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-5 gap-2 mt-3">
                  {[1, 2, 3, 4, 5].map((val) => {
                    const labels = ['Strongly Disagree', 'Disagree', 'Neutral', 'Agree', 'Strongly Agree'];
                    return (
                      <button
                        key={val}
                        type="button"
                        onClick={() => handlePillSelect('keepUp', val)}
                        className={`py-3 px-1 border rounded-xl text-center text-xs transition-all ${
                          formData.keepUp === val
                            ? 'bg-slate-900 border-slate-900 text-white font-semibold'
                            : showErrors && !formData.keepUp
                            ? 'border-red-300 bg-red-50/10 text-slate-700 hover:bg-slate-50'
                            : 'border-slate-200 text-slate-700 bg-white hover:bg-slate-50'
                        }`}
                      >
                        <span className="block font-bold text-sm mb-1">{val}</span>
                        <span className="text-[9px] leading-tight block">{labels[val - 1]}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Questions Answered */}
              <div>
                <label className="block text-sm font-bold text-slate-800 mb-1">
                  My questions were answered adequately this week <span className="text-red-500">*</span>
                </label>
                <p className="text-xs text-slate-500 mb-2">Select the option that best reflects your experience.</p>
                <select
                  required
                  value={formData.questionsAnswered}
                  onChange={(e) => setFormData((prev) => ({ ...prev, questionsAnswered: e.target.value }))}
                  className={`w-full p-2.5 border rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-slate-900 ${
                    showErrors && !formData.questionsAnswered ? 'border-red-400 bg-red-50/20' : 'border-slate-300'
                  }`}
                >
                  <option value="" disabled>Select...</option>
                  <option value="Always">Always</option>
                  <option value="Usually">Usually</option>
                  <option value="Sometimes">Sometimes</option>
                  <option value="Rarely">Rarely</option>
                  <option value="I didn't ask any">I didn't ask any</option>
                </select>
              </div>
            </div>
          </div>

          {/* SECTION 3: Course Material */}
          <div
            ref={sectionRefs.s3}
            id="sec-3"
            className={`bg-white rounded-2xl border p-6 md:p-8 transition-shadow hover:shadow-md ${
              showErrors && (!formData.materialsClear || !formData.materialsOnTime || !formData.exercisesMatched)
                ? 'border-red-300 shadow-sm shadow-red-50'
                : 'border-slate-200'
            }`}
          >
            <div className="flex items-center gap-4 mb-6">
              <div className="w-10 h-10 rounded-full bg-slate-900 text-white font-bold text-sm flex items-center justify-center">
                3
              </div>
              <div>
                <h3 className="font-bold text-slate-900 font-display">Course Material This Week</h3>
                <p className="text-slate-500 text-xs">Clarity, scheduling, and curriculum alignment</p>
              </div>
            </div>

            <div className="space-y-6">
              {/* Materials clear */}
              <div>
                <label className="block text-sm font-bold text-slate-800 mb-1">
                  This week's materials (slides, notes, exercises) were clear and useful <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-5 gap-2 mt-3">
                  {[1, 2, 3, 4, 5].map((val) => {
                    const labels = ['Strongly Disagree', 'Disagree', 'Neutral', 'Agree', 'Strongly Agree'];
                    return (
                      <button
                        key={val}
                        type="button"
                        onClick={() => handlePillSelect('materialsClear', val)}
                        className={`py-3 px-1 border rounded-xl text-center text-xs transition-all ${
                          formData.materialsClear === val
                            ? 'bg-slate-900 border-slate-900 text-white font-semibold'
                            : showErrors && !formData.materialsClear
                            ? 'border-red-300 bg-red-50/10 text-slate-700 hover:bg-slate-50'
                            : 'border-slate-200 text-slate-700 bg-white hover:bg-slate-50'
                        }`}
                      >
                        <span className="block font-bold text-sm mb-1">{val}</span>
                        <span className="text-[9px] leading-tight block">{labels[val - 1]}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Materials on time */}
              <div>
                <label className="block text-sm font-bold text-slate-800 mb-1">
                  Materials were available on time <span className="text-red-500">*</span>
                </label>
                <p className="text-xs text-slate-500 mb-2">Think about when you received or were granted access to the materials.</p>
                <select
                  required
                  value={formData.materialsOnTime}
                  onChange={(e) => setFormData((prev) => ({ ...prev, materialsOnTime: e.target.value }))}
                  className={`w-full p-2.5 border rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-slate-900 ${
                    showErrors && !formData.materialsOnTime ? 'border-red-400 bg-red-50/20' : 'border-slate-300'
                  }`}
                >
                  <option value="" disabled>Select...</option>
                  <option value="Yes, on time">Yes, on time</option>
                  <option value="Late">Late</option>
                  <option value="Not provided">Not provided</option>
                </select>
              </div>

              {/* Exercises matched */}
              <div>
                <label className="block text-sm font-bold text-slate-800 mb-1">
                  This week's exercises/assignments matched what was actually taught <span className="text-red-500">*</span>
                </label>
                <select
                  required
                  value={formData.exercisesMatched}
                  onChange={(e) => setFormData((prev) => ({ ...prev, exercisesMatched: e.target.value }))}
                  className={`w-full p-2.5 border rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-slate-900 ${
                    showErrors && !formData.exercisesMatched ? 'border-red-400 bg-red-50/20' : 'border-slate-300'
                  }`}
                >
                  <option value="" disabled>Select...</option>
                  <option value="Yes">Yes</option>
                  <option value="Partially">Partially</option>
                  <option value="No">No</option>
                </select>
              </div>
            </div>
          </div>

          {/* SECTION 4: Hands-On / Lab (Optional) */}
          <div
            ref={sectionRefs.s4}
            id="sec-4"
            className="bg-white rounded-2xl border border-slate-200 p-6 md:p-8 transition-shadow hover:shadow-md"
          >
            <div className="flex items-center gap-4 mb-6">
              <div className="w-10 h-10 rounded-full bg-slate-900 text-white font-bold text-sm flex items-center justify-center">
                4
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-slate-900 font-display">Hands-On / Lab Experience</h3>
                  <span className="text-[10px] bg-slate-100 text-slate-600 font-bold px-2 py-0.5 rounded-full uppercase">Optional</span>
                </div>
                <p className="text-slate-500 text-xs">Skip if this week had no lab or practical exercises</p>
              </div>
            </div>

            <div className="space-y-6">
              {/* Lab sufficient */}
              <div>
                <label className="block text-sm font-bold text-slate-800 mb-1">
                  Lab / hands-on time this week was sufficient
                </label>
                <div className="grid grid-cols-5 gap-2 mt-3">
                  {[1, 2, 3, 4, 5].map((val) => {
                    const labels = ['Strongly Disagree', 'Disagree', 'Neutral', 'Agree', 'Strongly Agree'];
                    return (
                      <button
                        key={val}
                        type="button"
                        onClick={() => handlePillSelect('labSufficient', val)}
                        className={`py-3 px-1 border rounded-xl text-center text-xs transition-all ${
                          formData.labSufficient === val
                            ? 'bg-slate-900 border-slate-900 text-white font-semibold'
                            : 'border-slate-200 text-slate-700 bg-white hover:bg-slate-50'
                        }`}
                      >
                        <span className="block font-bold text-sm mb-1">{val}</span>
                        <span className="text-[9px] leading-tight block">{labels[val - 1]}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Tools worked */}
              <div>
                <label className="block text-sm font-bold text-slate-800 mb-1">
                  The software/tools/equipment worked as expected this week
                </label>
                <select
                  value={formData.toolsWorked}
                  onChange={(e) => setFormData((prev) => ({ ...prev, toolsWorked: e.target.value }))}
                  className="w-full p-2.5 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-slate-900"
                >
                  <option value="" disabled>Select...</option>
                  <option value="Yes, no issues">Yes, no issues</option>
                  <option value="Minor issues">Minor issues</option>
                  <option value="Major issues">Major issues</option>
                </select>
              </div>

              {/* Could complete */}
              <div>
                <label className="block text-sm font-bold text-slate-800 mb-1">
                  I could complete this week's practical exercises with the support given
                </label>
                <select
                  value={formData.couldComplete}
                  onChange={(e) => setFormData((prev) => ({ ...prev, couldComplete: e.target.value }))}
                  className="w-full p-2.5 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-slate-900"
                >
                  <option value="" disabled>Select...</option>
                  <option value="Yes">Yes</option>
                  <option value="Partially">Partially</option>
                  <option value="No">No</option>
                </select>
              </div>
            </div>
          </div>

          {/* SECTION 5: Issues & Complaints */}
          <div
            ref={sectionRefs.s5}
            id="sec-5"
            className={`bg-white rounded-2xl border p-6 md:p-8 transition-shadow hover:shadow-md ${
              showErrors && !formData.hadIssue
                ? 'border-red-300 shadow-sm shadow-red-50'
                : 'border-slate-200'
            }`}
          >
            <div className="flex items-center gap-4 mb-6">
              <div className="w-10 h-10 rounded-full bg-slate-900 text-white font-bold text-sm flex items-center justify-center">
                5
              </div>
              <div>
                <h3 className="font-bold text-slate-900 font-display">Issues & Complaints</h3>
                <p className="text-slate-500 text-xs">Flag any concerns that impacted your progress</p>
              </div>
            </div>

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-bold text-slate-800 mb-1">
                  Did you experience any issue or concern this week? <span className="text-red-500">*</span>
                </label>
                <p className="text-xs text-slate-500 mb-3">If you choose Yes, we will open diagnostic fields below.</p>
                <div className="flex gap-4">
                  {['Yes', 'No'].map((choice) => (
                    <button
                      key={choice}
                      type="button"
                      onClick={() => {
                        setFormData((prev) => ({
                          ...prev,
                          hadIssue: choice as 'Yes' | 'No',
                          // Reset nested fields if they switch to No
                          issueCategories: choice === 'No' ? [] : prev.issueCategories,
                          severity: choice === 'No' ? '' : prev.severity,
                          issueDescription: choice === 'No' ? '' : prev.issueDescription,
                          repeatIssue: choice === 'No' ? '' : prev.repeatIssue
                        }));
                      }}
                      className={`w-32 py-3 border rounded-xl text-center font-bold text-sm transition-all ${
                        formData.hadIssue === choice
                          ? 'bg-red-500 border-red-500 text-white'
                          : showErrors && !formData.hadIssue
                          ? 'border-red-300 bg-red-50/10 text-slate-700 hover:bg-slate-50'
                          : 'border-slate-200 text-slate-700 bg-white hover:bg-slate-50'
                      }`}
                    >
                      {choice}
                    </button>
                  ))}
                </div>
              </div>

              {/* Conditional sections */}
              <AnimatePresence>
                {formData.hadIssue === 'Yes' && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="border-l-4 border-red-200 pl-4 space-y-6 overflow-hidden"
                  >
                    {/* Categories Checkboxes */}
                    <div>
                      <label className="block text-sm font-bold text-slate-800 mb-1">
                        What is this issue mainly about?
                      </label>
                      <p className="text-xs text-slate-500 mb-3">Select all that apply.</p>
                      <div className="flex flex-wrap gap-2">
                        {[
                          'Trainer/Delivery Style',
                          'Course Material',
                          'Pace of Teaching',
                          'Technical/Lab Equipment',
                          'Software/Tools Access',
                          'Schedule/Timing',
                          'Classroom/Facility',
                          'Communication/Admin',
                          'Peer/Classroom Environment'
                        ].map((cat) => {
                          const isChecked = formData.issueCategories.includes(cat);
                          return (
                            <button
                              key={cat}
                              type="button"
                              onClick={() => handleCheckboxToggle(cat)}
                              className={`py-2 px-3 border rounded-full text-xs font-semibold transition-all ${
                                isChecked
                                  ? 'bg-red-100 border-red-400 text-red-800'
                                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                              }`}
                            >
                              {cat}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Severity Radios */}
                    <div>
                      <label className="block text-sm font-bold text-slate-800 mb-1">
                        How would you rate the severity of this issue?
                      </label>
                      <p className="text-xs text-slate-500 mb-3">Choose the degree of disruption to your learning.</p>
                      <div className="grid grid-cols-4 gap-2">
                        {['Low', 'Medium', 'High', 'Urgent'].map((sev) => (
                          <button
                            key={sev}
                            type="button"
                            onClick={() => setFormData((prev) => ({ ...prev, severity: sev as any }))}
                            className={`py-2 px-1 border rounded-lg text-center text-xs font-semibold transition-all ${
                              formData.severity === sev
                                ? 'bg-red-500 border-red-500 text-white'
                                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                            }`}
                          >
                            {sev}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Description Textarea */}
                    <div>
                      <label className="block text-sm font-bold text-slate-800 mb-1" htmlFor="issueDesc">
                        Please describe the issue
                      </label>
                      <p className="text-xs text-slate-500 mb-2">Briefly tell us what happened and when.</p>
                      <textarea
                        id="issueDesc"
                        rows={3}
                        value={formData.issueDescription}
                        onChange={(e) => setFormData((prev) => ({ ...prev, issueDescription: e.target.value }))}
                        placeholder="Explain the specific problem..."
                        className="w-full p-2.5 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-red-500"
                      />
                    </div>

                    {/* Repeat issue */}
                    <div>
                      <label className="block text-sm font-bold text-slate-800 mb-1">
                        Has this issue come up in a previous week too?
                      </label>
                      <div className="flex gap-2">
                        {['Yes', 'No', 'Not sure'].map((rep) => (
                          <button
                            key={rep}
                            type="button"
                            onClick={() => setFormData((prev) => ({ ...prev, repeatIssue: rep as any }))}
                            className={`flex-1 py-2 border rounded-lg text-xs font-semibold transition-all ${
                              formData.repeatIssue === rep
                                ? 'bg-slate-900 border-slate-900 text-white'
                                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                            }`}
                          >
                            {rep}
                          </button>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* SECTION 6: Overall Pulse */}
          <div
            ref={sectionRefs.s6}
            id="sec-6"
            className={`bg-white rounded-2xl border p-6 md:p-8 transition-shadow hover:shadow-md ${
              showErrors && (!formData.overallSatisfaction || !formData.confidence)
                ? 'border-red-300 shadow-sm shadow-red-50'
                : 'border-slate-200'
            }`}
          >
            <div className="flex items-center gap-4 mb-6">
              <div className="w-10 h-10 rounded-full bg-slate-900 text-white font-bold text-sm flex items-center justify-center">
                6
              </div>
              <div>
                <h3 className="font-bold text-slate-900 font-display">Overall Weekly Pulse</h3>
                <p className="text-slate-500 text-xs">Summary satisfaction and progression sentiment</p>
              </div>
            </div>

            <div className="space-y-6">
              {/* Satisfaction */}
              <div>
                <label className="block text-sm font-bold text-slate-800 mb-1">
                  Overall, how was this week for you? <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-5 gap-2 mt-3">
                  {[1, 2, 3, 4, 5].map((val) => {
                    const labels = ['Very Unsatisfied', 'Unsatisfied', 'Neutral', 'Satisfied', 'Very Satisfied'];
                    return (
                      <button
                        key={val}
                        type="button"
                        onClick={() => handlePillSelect('overallSatisfaction', val)}
                        className={`py-3 px-1 border rounded-xl text-center text-xs transition-all ${
                          formData.overallSatisfaction === val
                            ? 'bg-slate-900 border-slate-900 text-white font-semibold'
                            : showErrors && !formData.overallSatisfaction
                            ? 'border-red-300 bg-red-50/10 text-slate-700 hover:bg-slate-50'
                            : 'border-slate-200 text-slate-700 bg-white hover:bg-slate-50'
                        }`}
                      >
                        <span className="block font-bold text-sm mb-1">{val}</span>
                        <span className="text-[9px] leading-tight block">{labels[val - 1]}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Confidence */}
              <div>
                <label className="block text-sm font-bold text-slate-800 mb-1">
                  How confident do you feel about keeping up with the rest of the course? <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-5 gap-2 mt-3">
                  {[1, 2, 3, 4, 5].map((val) => {
                    const labels = ['Not Confident', 'Slightly Confident', 'Neutral', 'Confident', 'Very Confident'];
                    return (
                      <button
                        key={val}
                        type="button"
                        onClick={() => handlePillSelect('confidence', val)}
                        className={`py-3 px-1 border rounded-xl text-center text-xs transition-all ${
                          formData.confidence === val
                            ? 'bg-slate-900 border-slate-900 text-white font-semibold'
                            : showErrors && !formData.confidence
                            ? 'border-red-300 bg-red-50/10 text-slate-700 hover:bg-slate-50'
                            : 'border-slate-200 text-slate-700 bg-white hover:bg-slate-50'
                        }`}
                      >
                        <span className="block font-bold text-sm mb-1">{val}</span>
                        <span className="text-[9px] leading-tight block">{labels[val - 1]}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Comments Textarea */}
              <div>
                <label className="block text-sm font-bold text-slate-800 mb-1" htmlFor="addComments">
                  Anything else you'd like the training team to know?
                </label>
                <p className="text-xs text-slate-500 mb-2">Feel free to share suggestions, praises, or elaborate on answers.</p>
                <textarea
                  id="addComments"
                  rows={3}
                  value={formData.additionalComments}
                  onChange={(e) => setFormData((prev) => ({ ...prev, additionalComments: e.target.value }))}
                  placeholder="Your open comments..."
                  className="w-full p-2.5 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
              </div>
            </div>
          </div>

          <div className="pt-4 flex flex-col items-center gap-3">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full sm:w-auto px-10 py-4 bg-red-500 hover:bg-red-600 text-white text-base font-bold rounded-xl shadow-lg shadow-red-100 transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Submitting Pulse...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-5 h-5" />
                  Submit Weekly Pulse Feedback
                </>
              )}
            </button>
            <p className="text-[11px] text-slate-400 text-center flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-slate-400" />
              Submissions go directly to Training Operations at New Horizons Computer Learning Centers.
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}

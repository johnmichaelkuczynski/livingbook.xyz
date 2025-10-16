import React, { useState } from 'react';
import { X, Copy, Download, Printer, CheckCircle, XCircle } from 'lucide-react';

interface TestData {
  title: string;
  multipleChoice: Array<{
    question: string;
    options: string[];
    correctAnswer: number;
  }>;
  shortAnswer: Array<{
    question: string;
    sampleAnswer: string;
  }>;
}

interface TestModalProps {
  isOpen: boolean;
  onClose: () => void;
  content: string | TestData;
  isLoading?: boolean;
}

export default function TestModal({ isOpen, onClose, content, isLoading = false }: TestModalProps) {
  const [copied, setCopied] = useState(false);
  const [isTestMode, setIsTestMode] = useState(false);
  const [userAnswers, setUserAnswers] = useState<{
    multipleChoice: number[];
    shortAnswer: string[];
  }>({ multipleChoice: [], shortAnswer: [] });
  const [isGrading, setIsGrading] = useState(false);
  const [gradeResults, setGradeResults] = useState<any>(null);

  if (!isOpen) return null;

  const isTestData = typeof content === 'object' && content !== null && 'multipleChoice' in content;
  const testData = isTestData ? content as TestData : null;

  const handleCopy = async () => {
    try {
      const textContent = isTestData ? JSON.stringify(content, null, 2) : content;
      await navigator.clipboard.writeText(textContent);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy text:', error);
    }
  };

  const handleMultipleChoiceAnswer = (questionIndex: number, answerIndex: number) => {
    const newAnswers = [...userAnswers.multipleChoice];
    newAnswers[questionIndex] = answerIndex;
    setUserAnswers({ ...userAnswers, multipleChoice: newAnswers });
  };

  const handleShortAnswerChange = (questionIndex: number, value: string) => {
    const newAnswers = [...userAnswers.shortAnswer];
    newAnswers[questionIndex] = value;
    setUserAnswers({ ...userAnswers, shortAnswer: newAnswers });
  };

  const handleSubmitTest = async () => {
    if (!testData) return;
    
    setIsGrading(true);
    try {
      const response = await fetch('/api/grade-test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          selectedText: (window as any).selectedTextForTest || '',
          testData: testData,
          userAnswers: userAnswers,
          provider: 'deepseek'
        }),
      });

      if (!response.ok) {
        throw new Error(`Grading failed: ${response.statusText}`);
      }

      const results = await response.json();
      setGradeResults(results);
    } catch (error) {
      console.error('Grading error:', error);
      alert('Failed to grade test. Please try again.');
    } finally {
      setIsGrading(false);
    }
  };

  const handleDownloadTXT = () => {
    const textContent = isTestData ? JSON.stringify(content, null, 2) : content;
    const blob = new Blob([textContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'test.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      const textContent = isTestData ? JSON.stringify(content, null, 2) : content;
      printWindow.document.write(`
        <html>
          <head>
            <title>Test Questions</title>
            <style>
              body { 
                font-family: Arial, sans-serif; 
                line-height: 1.6; 
                padding: 20px; 
                max-width: 800px;
                margin: 0 auto;
              }
              h1 { 
                color: #333; 
                border-bottom: 2px solid #333; 
                text-align: center;
              }
              h2 { 
                color: #555; 
                margin-top: 30px; 
              }
              p { 
                margin-bottom: 15px; 
              }
              .question {
                margin-bottom: 20px;
                page-break-inside: avoid;
              }
              .answer-choice {
                margin-left: 20px;
                margin-bottom: 5px;
              }
              .divider {
                border-top: 2px solid #ddd;
                margin: 30px 0;
                padding-top: 20px;
              }
            </style>
          </head>
          <body>
            <h1>Test Questions</h1>
            <div style="white-space: pre-wrap; font-family: Arial, sans-serif;">${textContent}</div>
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 99999
    }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '8px',
        width: '90%',
        maxWidth: '900px',
        maxHeight: '90%',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 10px 25px rgba(0, 0, 0, 0.3)'
      }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '16px 20px',
          borderBottom: '1px solid #e5e7eb',
          backgroundColor: '#f9fafb'
        }}>
          <h2 style={{
            margin: 0,
            fontSize: '18px',
            fontWeight: '600',
            color: '#111827'
          }}>
            📝 Test Questions
          </h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {testData && !gradeResults && (
              <button
                onClick={() => setIsTestMode(!isTestMode)}
                style={{
                  backgroundColor: isTestMode ? '#dc2626' : '#059669',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '8px 12px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '500'
                }}
              >
                {isTestMode ? 'View Questions' : 'Take Test'}
              </button>
            )}
            {isTestMode && testData && !gradeResults && (
              <button
                onClick={handleSubmitTest}
                disabled={isGrading}
                style={{
                  backgroundColor: '#8b5cf6',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '8px 12px',
                  cursor: isGrading ? 'not-allowed' : 'pointer',
                  fontSize: '14px',
                  fontWeight: '500',
                  opacity: isGrading ? 0.5 : 1
                }}
              >
                {isGrading ? 'Grading...' : 'Submit Test'}
              </button>
            )}
            <button
              onClick={handleCopy}
              disabled={isLoading || !content}
              style={{
                backgroundColor: copied ? '#10b981' : '#3b82f6',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                padding: '8px 12px',
                cursor: isLoading ? 'not-allowed' : 'pointer',
                fontSize: '14px',
                fontWeight: '500',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                opacity: isLoading ? 0.5 : 1
              }}
            >
              <Copy size={16} />
              {copied ? 'Copied!' : 'Copy'}
            </button>
            <button
              onClick={handleDownloadTXT}
              disabled={isLoading || !content}
              style={{
                backgroundColor: '#8b5cf6',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                padding: '8px 12px',
                cursor: isLoading ? 'not-allowed' : 'pointer',
                fontSize: '14px',
                fontWeight: '500',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                opacity: isLoading ? 0.5 : 1
              }}
            >
              <Download size={16} />
              TXT
            </button>
            <button
              onClick={handlePrint}
              disabled={isLoading || !content}
              style={{
                backgroundColor: '#059669',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                padding: '8px 12px',
                cursor: isLoading ? 'not-allowed' : 'pointer',
                fontSize: '14px',
                fontWeight: '500',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                opacity: isLoading ? 0.5 : 1
              }}
            >
              <Printer size={16} />
              Print
            </button>
            <button
              onClick={onClose}
              style={{
                backgroundColor: 'transparent',
                border: 'none',
                cursor: 'pointer',
                padding: '4px',
                borderRadius: '4px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <X size={20} color="#6b7280" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div style={{
          flex: 1,
          padding: '20px',
          overflow: 'auto',
          backgroundColor: 'white'
        }}>
          {isLoading ? (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              height: '200px',
              gap: '16px'
            }}>
              <div style={{
                width: '40px',
                height: '40px',
                border: '4px solid #e5e7eb',
                borderTop: '4px solid #3b82f6',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite'
              }}></div>
              <p style={{
                color: '#6b7280',
                fontSize: '16px',
                margin: 0
              }}>
                Generating test questions...
              </p>
            </div>
          ) : gradeResults ? (
            // Show grade results
            <div>
              <h3 style={{ color: '#059669', marginBottom: '20px', fontSize: '20px' }}>
                Test Results - {gradeResults.percentage}%
              </h3>
              
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
                gap: '15px',
                marginBottom: '25px'
              }}>
                <div style={{ 
                  padding: '15px', 
                  backgroundColor: '#f0f9ff', 
                  borderRadius: '8px',
                  border: '1px solid #0ea5e9'
                }}>
                  <div style={{ fontWeight: 'bold', color: '#0369a1' }}>Multiple Choice</div>
                  <div>{gradeResults.multipleChoiceScore}/{gradeResults.multipleChoiceTotal}</div>
                </div>
                <div style={{ 
                  padding: '15px', 
                  backgroundColor: '#f0fdf4', 
                  borderRadius: '8px',
                  border: '1px solid #22c55e'
                }}>
                  <div style={{ fontWeight: 'bold', color: '#16a34a' }}>Short Answer</div>
                  <div>{gradeResults.shortAnswerScore}/{gradeResults.shortAnswerTotal}</div>
                </div>
                <div style={{ 
                  padding: '15px', 
                  backgroundColor: '#fef3c7', 
                  borderRadius: '8px',
                  border: '1px solid #f59e0b'
                }}>
                  <div style={{ fontWeight: 'bold', color: '#d97706' }}>Total Score</div>
                  <div>{gradeResults.totalScore}/{gradeResults.totalPossible}</div>
                </div>
              </div>

              {gradeResults.gradingData?.shortAnswerGrades?.map((grade: any, index: number) => (
                <div key={index} style={{ 
                  marginBottom: '20px', 
                  padding: '15px', 
                  backgroundColor: '#f9fafb',
                  borderRadius: '8px',
                  border: '1px solid #e5e7eb'
                }}>
                  <div style={{ fontWeight: 'bold', marginBottom: '8px' }}>
                    Short Answer {index + 1}: {grade.score}/10
                  </div>
                  <div style={{ color: '#6b7280' }}>{grade.feedback}</div>
                </div>
              ))}

              {gradeResults.gradingData?.overallFeedback && (
                <div style={{ 
                  padding: '15px', 
                  backgroundColor: '#eff6ff',
                  borderRadius: '8px',
                  border: '1px solid #3b82f6',
                  marginTop: '20px'
                }}>
                  <div style={{ fontWeight: 'bold', color: '#1d4ed8', marginBottom: '8px' }}>
                    Overall Feedback
                  </div>
                  <div style={{ color: '#374151' }}>{gradeResults.gradingData.overallFeedback}</div>
                </div>
              )}
            </div>
          ) : testData && isTestMode ? (
            // Interactive test mode
            <div>
              <h3 style={{ marginBottom: '25px', color: '#374151' }}>{testData.title}</h3>
              
              <h4 style={{ 
                color: '#1f2937', 
                borderBottom: '2px solid #e5e7eb', 
                paddingBottom: '8px',
                marginBottom: '20px'
              }}>
                Multiple Choice Questions
              </h4>
              
              {testData.multipleChoice.map((question, qIndex) => (
                <div key={qIndex} style={{ marginBottom: '25px' }}>
                  <div style={{ 
                    fontWeight: '500', 
                    marginBottom: '12px',
                    color: '#374151'
                  }}>
                    {qIndex + 1}. {question.question}
                  </div>
                  
                  {question.options.map((option, oIndex) => (
                    <label key={oIndex} style={{
                      display: 'block',
                      marginBottom: '8px',
                      cursor: 'pointer',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      backgroundColor: userAnswers.multipleChoice[qIndex] === oIndex ? '#dbeafe' : '#f9fafb',
                      border: userAnswers.multipleChoice[qIndex] === oIndex ? '1px solid #3b82f6' : '1px solid #e5e7eb',
                      transition: 'all 0.2s'
                    }}>
                      <input
                        type="radio"
                        name={`question-${qIndex}`}
                        checked={userAnswers.multipleChoice[qIndex] === oIndex}
                        onChange={() => handleMultipleChoiceAnswer(qIndex, oIndex)}
                        style={{ marginRight: '8px' }}
                      />
                      {option}
                    </label>
                  ))}
                </div>
              ))}
              
              <div style={{
                borderTop: '2px solid #e5e7eb',
                paddingTop: '25px',
                marginTop: '25px'
              }}>
                <h4 style={{ 
                  color: '#1f2937', 
                  marginBottom: '20px'
                }}>
                  Short Answer Questions
                </h4>
                
                {testData.shortAnswer.map((question, qIndex) => (
                  <div key={qIndex} style={{ marginBottom: '25px' }}>
                    <div style={{ 
                      fontWeight: '500', 
                      marginBottom: '12px',
                      color: '#374151'
                    }}>
                      {qIndex + 1}. {question.question}
                    </div>
                    
                    <textarea
                      value={userAnswers.shortAnswer[qIndex] || ''}
                      onChange={(e) => handleShortAnswerChange(qIndex, e.target.value)}
                      placeholder="Enter your answer here..."
                      style={{
                        width: '100%',
                        minHeight: '100px',
                        padding: '12px',
                        border: '1px solid #d1d5db',
                        borderRadius: '6px',
                        fontSize: '14px',
                        fontFamily: 'system-ui, -apple-system, sans-serif',
                        resize: 'vertical'
                      }}
                    />
                  </div>
                ))}
              </div>
            </div>
          ) : testData ? (
            // Review mode - show questions without answers
            <div>
              <h3 style={{ marginBottom: '25px', color: '#374151' }}>{testData.title}</h3>
              
              <h4 style={{ 
                color: '#1f2937', 
                borderBottom: '2px solid #e5e7eb', 
                paddingBottom: '8px',
                marginBottom: '20px'
              }}>
                Multiple Choice Questions
              </h4>
              
              {testData.multipleChoice.map((question, qIndex) => (
                <div key={qIndex} style={{ marginBottom: '25px' }}>
                  <div style={{ 
                    fontWeight: '500', 
                    marginBottom: '12px',
                    color: '#374151'
                  }}>
                    {qIndex + 1}. {question.question}
                  </div>
                  
                  {question.options.map((option, oIndex) => (
                    <div key={oIndex} style={{
                      marginLeft: '20px',
                      marginBottom: '8px',
                      color: '#6b7280'
                    }}>
                      {option}
                    </div>
                  ))}
                </div>
              ))}
              
              <div style={{
                borderTop: '2px solid #e5e7eb',
                paddingTop: '25px',
                marginTop: '25px'
              }}>
                <h4 style={{ 
                  color: '#1f2937', 
                  marginBottom: '20px'
                }}>
                  Short Answer Questions
                </h4>
                
                {testData.shortAnswer.map((question, qIndex) => (
                  <div key={qIndex} style={{ marginBottom: '20px' }}>
                    <div style={{ 
                      fontWeight: '500',
                      color: '#374151'
                    }}>
                      {qIndex + 1}. {question.question}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div style={{
              lineHeight: '1.8',
              fontSize: '15px',
              color: '#374151',
              whiteSpace: 'pre-wrap',
              fontFamily: 'system-ui, -apple-system, sans-serif'
            }}>
              {typeof content === 'string' ? content : 'No test content available'}
            </div>
          )}
        </div>

      </div>

      <style dangerouslySetInnerHTML={{
        __html: `
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `
      }} />
    </div>
  );
}
import React, { useState } from 'react';
import { X, FileText, CheckSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';

interface Question {
  id: number;
  type: 'multiple_choice' | 'short_answer' | 'long_answer';
  question: string;
  options?: string[];
  correct_answer: string;
  explanation: string;
}

interface TestResult {
  score: number;
  totalQuestions: number;
  feedback: {
    questionId: number;
    userAnswer: string;
    correctAnswer: string;
    isCorrect: boolean;
    explanation: string;
  }[];
}

interface TestMeModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedText: string;
  isGenerating: boolean;
}

export default function TestMeModal({
  isOpen,
  onClose,
  selectedText,
  isGenerating
}: TestMeModalProps) {
  const [view, setView] = useState<'config' | 'generated' | 'test' | 'results'>('config');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [userAnswers, setUserAnswers] = useState<{[key: number]: string}>({});
  const [testResult, setTestResult] = useState<TestResult | null>(null);
  
  // Configuration state
  const [questionTypes, setQuestionTypes] = useState({
    multipleChoice: true,
    shortAnswer: false,
    longAnswer: false
  });
  const [numberOfQuestions, setNumberOfQuestions] = useState('5');
  const [customInstructions, setCustomInstructions] = useState('');
  const [isSubmittingTest, setIsSubmittingTest] = useState(false);

  const generateTest = async () => {
    const activeTypes = [];
    if (questionTypes.multipleChoice) activeTypes.push('multiple_choice');
    if (questionTypes.shortAnswer) activeTypes.push('short_answer');
    if (questionTypes.longAnswer) activeTypes.push('long_answer');

    const mcCount = questionTypes.multipleChoice ? Math.ceil(parseInt(numberOfQuestions) * 0.7) : 0;
    const saCount = parseInt(numberOfQuestions) - mcCount;

    try {
      const response = await fetch('/api/generate-test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          selectedText,
          totalQuestions: parseInt(numberOfQuestions),
          multipleChoiceCount: mcCount,
          shortAnswerCount: saCount,
          customInstructions
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate test');
      }

      const data = await response.json();
      setQuestions(data.questions);
      setView('generated');
    } catch (error) {
      console.error('Test generation error:', error);
    }
  };

  const takeTest = () => {
    setUserAnswers({});
    setView('test');
  };

  const submitTest = async () => {
    setIsSubmittingTest(true);
    try {
      const response = await fetch('/api/grade-test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          questions,
          userAnswers,
          selectedText
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to grade test');
      }

      const result = await response.json();
      setTestResult(result);
      setView('results');
    } catch (error) {
      console.error('Test grading error:', error);
    } finally {
      setIsSubmittingTest(false);
    }
  };

  const generateNewTest = () => {
    setView('config');
    setQuestions([]);
    setUserAnswers({});
    setTestResult(null);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-5xl h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b shrink-0">
          <div className="flex items-center gap-3">
            <FileText className="w-6 h-6 text-blue-600" />
            <h2 className="text-xl font-semibold text-gray-900">
              Test Me - Student Practice Test
            </h2>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Left Panel - Configuration */}
          <div className="w-1/2 border-r bg-gray-50">
            <ScrollArea className="h-full">
              <div className="p-6 space-y-6">
                {/* Question Types */}
                <div>
                  <h3 className="text-lg font-semibold mb-3">Question Types</h3>
                  <div className="space-y-3">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="multiple-choice"
                        checked={questionTypes.multipleChoice}
                        onCheckedChange={(checked) =>
                          setQuestionTypes(prev => ({ ...prev, multipleChoice: !!checked }))
                        }
                      />
                      <Label htmlFor="multiple-choice" className="font-medium">
                        Multiple Choice
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="short-answer"
                        checked={questionTypes.shortAnswer}
                        onCheckedChange={(checked) =>
                          setQuestionTypes(prev => ({ ...prev, shortAnswer: !!checked }))
                        }
                      />
                      <Label htmlFor="short-answer" className="font-medium">
                        Short Answer (1-3 sentences)
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="long-answer"
                        checked={questionTypes.longAnswer}
                        onCheckedChange={(checked) =>
                          setQuestionTypes(prev => ({ ...prev, longAnswer: !!checked }))
                        }
                      />
                      <Label htmlFor="long-answer" className="font-medium">
                        Long Answer (paragraph)
                      </Label>
                    </div>
                  </div>
                </div>

                {/* Number of Questions */}
                <div>
                  <h3 className="text-lg font-semibold mb-3">Number of Questions</h3>
                  <Select value={numberOfQuestions} onValueChange={setNumberOfQuestions}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[3, 5, 7, 10, 15].map(num => (
                        <SelectItem key={num} value={num.toString()}>
                          {num} Questions
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Custom Instructions */}
                <div>
                  <h3 className="text-lg font-semibold mb-3">Custom Instructions (Optional)</h3>
                  <Textarea
                    placeholder="e.g., 'Focus on logical reasoning, moderate difficulty, include practical examples'"
                    value={customInstructions}
                    onChange={(e) => setCustomInstructions(e.target.value)}
                    className="h-20 resize-none"
                  />
                  <p className="text-sm text-gray-600 mt-1">
                    Specify difficulty level, topics to focus on, or other requirements.
                  </p>
                </div>

                {/* Selected Text Preview */}
                <div>
                  <h3 className="text-lg font-semibold mb-3">Selected Text Preview</h3>
                  <div className="bg-white border rounded-lg p-4 max-h-32 overflow-y-auto">
                    <p className="text-sm text-gray-700">
                      {selectedText.substring(0, 500)}
                      {selectedText.length > 500 && '...'}
                    </p>
                  </div>
                </div>
              </div>
            </ScrollArea>
          </div>

          {/* Right Panel - Generated Test/Results */}
          <div className="w-1/2 bg-white flex flex-col max-h-full overflow-hidden">
            {view === 'config' && (
              <div className="flex-1 flex items-center justify-center">
                {isGenerating ? (
                  <div className="text-center p-8">
                    <div className="w-16 h-16 mx-auto mb-4 relative">
                      <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Generating Your Test</h3>
                    <p className="text-gray-600 mb-4">
                      AI is creating {numberOfQuestions} {Object.values(questionTypes).filter(Boolean).length > 1 ? 'mixed-type' : 
                        questionTypes.multipleChoice ? 'multiple choice' :
                        questionTypes.shortAnswer ? 'short answer' : 'long answer'} questions...
                    </p>
                    <div className="w-full max-w-xs mx-auto bg-gray-200 rounded-full h-2 mb-4">
                      <div className="bg-blue-600 h-2 rounded-full animate-pulse" style={{width: '60%'}}></div>
                    </div>
                    <p className="text-sm text-gray-500">This may take 10-30 seconds</p>
                  </div>
                ) : (
                  <div className="text-center p-8">
                    <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600 mb-6">
                      Generate a practice test to see it here
                    </p>
                    <Button 
                      onClick={generateTest} 
                      disabled={isGenerating || !Object.values(questionTypes).some(Boolean)}
                      className="w-full max-w-xs"
                    >
                      Generate Practice Test
                    </Button>
                  </div>
                )}
              </div>
            )}

            {view === 'generated' && (
              <div className="flex-1 flex flex-col">
                <div className="p-6 border-b">
                  <div className="flex items-center gap-3 mb-4">
                    <CheckSquare className="w-6 h-6 text-green-600" />
                    <h3 className="text-lg font-semibold text-gray-900">Generated Practice Test</h3>
                  </div>
                  <div className="flex items-center justify-between">
                    <Button
                      onClick={generateNewTest}
                      variant="outline"
                      size="sm"
                    >
                      Generate New Test
                    </Button>
                    <Button
                      onClick={takeTest}
                      className="flex items-center gap-2"
                    >
                      Take Test
                    </Button>
                  </div>
                </div>

                <ScrollArea className="flex-1">
                  <div className="p-6 space-y-4">
                    {questions.map((question, index) => (
                      <div key={question.id} className="border rounded-lg p-4 bg-gray-50">
                        <h4 className="font-medium text-gray-900 mb-2">
                          {index + 1}. {question.question}
                        </h4>
                        
                        {question.type === 'multiple_choice' && question.options && (
                          <div className="space-y-2 ml-4">
                            {question.options.map((option, optionIndex) => (
                              <div key={optionIndex} className="text-sm text-gray-700">
                                {String.fromCharCode(65 + optionIndex)}) {option}
                              </div>
                            ))}
                          </div>
                        )}
                        
                        <div className="mt-2">
                          <span className="text-xs text-gray-500 bg-gray-200 px-2 py-1 rounded">
                            {question.type === 'multiple_choice' ? 'Multiple Choice' : 
                             question.type === 'short_answer' ? 'Short Answer' : 'Long Answer'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            )}

            {view === 'test' && (
              <div className="flex-1 flex flex-col min-h-0">
                <div className="p-6 border-b flex-shrink-0">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Take Your Practice Test</h3>
                  <div className="flex items-center justify-between">
                    <Button
                      onClick={generateNewTest}
                      variant="outline"
                      size="sm"
                    >
                      Generate New Test
                    </Button>
                    <span className="text-sm text-gray-600">
                      {Object.keys(userAnswers).length} of {questions.length} questions answered
                    </span>
                  </div>
                </div>

                <div className="flex-1 overflow-auto">
                  <div className="p-6 space-y-6">
                    {questions.map((question, index) => (
                      <div key={question.id} className="border-b pb-6 last:border-b-0">
                        <h4 className="font-medium text-gray-900 mb-3">
                          {index + 1}. {question.question}
                        </h4>
                        
                        {question.type === 'multiple_choice' && question.options ? (
                          <div className="space-y-2">
                            <span className="text-sm text-gray-600 font-medium">Multiple Choice</span>
                            <RadioGroup
                              value={userAnswers[question.id] || ''}
                              onValueChange={(value) => 
                                setUserAnswers(prev => ({...prev, [question.id]: value}))
                              }
                            >
                              {question.options.map((option, optionIndex) => (
                                <div key={optionIndex} className="flex items-start space-x-2">
                                  <RadioGroupItem 
                                    value={option} 
                                    id={`q${question.id}-${optionIndex}`}
                                    className="mt-1"
                                  />
                                  <Label 
                                    htmlFor={`q${question.id}-${optionIndex}`} 
                                    className="text-sm cursor-pointer"
                                  >
                                    {String.fromCharCode(65 + optionIndex)}) {option}
                                  </Label>
                                </div>
                              ))}
                            </RadioGroup>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            <span className="text-sm text-gray-600 font-medium">
                              {question.type === 'short_answer' ? 'Short Answer' : 'Long Answer'}
                            </span>
                            <Textarea
                              placeholder={`Type your ${question.type === 'short_answer' ? 'short' : 'detailed'} answer here...`}
                              value={userAnswers[question.id] || ''}
                              onChange={(e) => 
                                setUserAnswers(prev => ({...prev, [question.id]: e.target.value}))
                              }
                              className={question.type === 'long_answer' ? "min-h-24" : "min-h-16"}
                            />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="p-6 border-t bg-gray-50 flex-shrink-0">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">
                      {Object.keys(userAnswers).length} of {questions.length} questions answered
                    </span>
                    <Button 
                      onClick={submitTest}
                      disabled={isSubmittingTest || Object.keys(userAnswers).length < questions.length}
                      className="bg-purple-600 hover:bg-purple-700 flex items-center gap-2"
                    >
                      {isSubmittingTest && (
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      )}
                      {isSubmittingTest ? 'Grading Test...' : 'Submit & Grade Test'}
                    </Button>
                  </div>
                  {isSubmittingTest && (
                    <div className="mt-3 text-center">
                      <p className="text-sm text-gray-600">AI is reviewing your answers...</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {view === 'results' && testResult && (
              <div className="flex-1 flex flex-col">
                <div className="p-6 border-b">
                  <h3 className="text-lg font-semibold text-gray-900">Test Results</h3>
                  <div className="mt-4 p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg">
                    <div className="text-center">
                      <div className="text-3xl font-bold text-gray-900">
                        {Math.round((testResult.score / testResult.totalQuestions) * 100)}%
                      </div>
                      <p className="text-gray-700">
                        {testResult.score} out of {testResult.totalQuestions} correct
                      </p>
                    </div>
                  </div>
                </div>

                <ScrollArea className="flex-1">
                  <div className="p-6 space-y-4">
                    {testResult.feedback.map((feedback, index) => (
                      <div 
                        key={feedback.questionId}
                        className={`p-4 rounded-lg border-l-4 ${
                          feedback.isCorrect 
                            ? 'bg-green-50 border-green-500' 
                            : 'bg-red-50 border-red-500'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-white text-sm font-bold ${
                            feedback.isCorrect ? 'bg-green-500' : 'bg-red-500'
                          }`}>
                            {feedback.isCorrect ? '✓' : '✗'}
                          </div>
                          <div className="flex-1 space-y-2">
                            <p className="font-medium">Question {index + 1}</p>
                            <p className="text-sm"><strong>Your answer:</strong> {feedback.userAnswer}</p>
                            {!feedback.isCorrect && (
                              <p className="text-sm"><strong>Correct answer:</strong> {feedback.correctAnswer}</p>
                            )}
                            <p className="text-sm"><strong>Explanation:</strong> {feedback.explanation}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>

                <div className="p-6 border-t">
                  <Button onClick={generateNewTest} className="w-full">
                    Generate New Test
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
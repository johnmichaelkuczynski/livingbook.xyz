import React, { useState } from 'react';
import { X, Play, FileText, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';

interface Question {
  id: number;
  type: 'multiple_choice' | 'short_answer';
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
  const [step, setStep] = useState<'configure' | 'generated' | 'taking' | 'results'>('configure');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [userAnswers, setUserAnswers] = useState<{[key: number]: string}>({});
  const [testResult, setTestResult] = useState<TestResult | null>(null);
  
  // Configuration state
  const [totalQuestions, setTotalQuestions] = useState([5]);
  const [multipleChoiceCount, setMultipleChoiceCount] = useState([3]);
  const [isSubmittingTest, setIsSubmittingTest] = useState(false);

  const shortAnswerCount = totalQuestions[0] - multipleChoiceCount[0];

  const generateTest = async () => {
    try {
      const response = await fetch('/api/generate-test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          selectedText,
          totalQuestions: totalQuestions[0],
          multipleChoiceCount: multipleChoiceCount[0],
          shortAnswerCount
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate test');
      }

      const data = await response.json();
      setQuestions(data.questions);
      setStep('generated');
    } catch (error) {
      console.error('Test generation error:', error);
    }
  };

  const startTest = () => {
    setUserAnswers({});
    setStep('taking');
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
      setStep('results');
    } catch (error) {
      console.error('Test grading error:', error);
    } finally {
      setIsSubmittingTest(false);
    }
  };

  const resetTest = () => {
    setStep('configure');
    setQuestions([]);
    setUserAnswers({});
    setTestResult(null);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center gap-3">
            <FileText className="w-6 h-6 text-primary" />
            <div>
              <h2 className="text-xl font-semibold">Test Me</h2>
              <p className="text-sm text-gray-600">
                {step === 'configure' && 'Configure your test'}
                {step === 'generated' && 'Test generated successfully'}
                {step === 'taking' && 'Taking test'}
                {step === 'results' && 'Test results'}
              </p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>

        <ScrollArea className="max-h-[70vh]">
          <div className="p-6">
            {/* Configuration Step */}
            {step === 'configure' && (
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Selected Text Preview</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="bg-gray-50 p-4 rounded-lg max-h-40 overflow-y-auto">
                      <p className="text-sm text-gray-700">
                        {selectedText.substring(0, 300)}
                        {selectedText.length > 300 && '...'}
                      </p>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Test Configuration</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div>
                      <Label className="text-base font-medium">
                        Total Questions: {totalQuestions[0]}
                      </Label>
                      <div className="mt-3">
                        <Slider
                          value={totalQuestions}
                          onValueChange={setTotalQuestions}
                          min={3}
                          max={10}
                          step={1}
                          className="w-full"
                        />
                        <div className="flex justify-between text-xs text-gray-500 mt-1">
                          <span>3</span>
                          <span>10</span>
                        </div>
                      </div>
                    </div>

                    <div>
                      <Label className="text-base font-medium">
                        Multiple Choice Questions: {multipleChoiceCount[0]}
                      </Label>
                      <div className="mt-3">
                        <Slider
                          value={multipleChoiceCount}
                          onValueChange={(value) => {
                            if (value[0] <= totalQuestions[0]) {
                              setMultipleChoiceCount(value);
                            }
                          }}
                          min={0}
                          max={totalQuestions[0]}
                          step={1}
                          className="w-full"
                        />
                        <div className="flex justify-between text-xs text-gray-500 mt-1">
                          <span>0</span>
                          <span>{totalQuestions[0]}</span>
                        </div>
                      </div>
                    </div>

                    <div className="bg-blue-50 p-4 rounded-lg">
                      <h4 className="font-medium text-blue-900 mb-2">Test Summary</h4>
                      <div className="text-sm text-blue-800 space-y-1">
                        <p>• Total Questions: {totalQuestions[0]}</p>
                        <p>• Multiple Choice: {multipleChoiceCount[0]}</p>
                        <p>• Short Answer: {shortAnswerCount}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <div className="flex justify-end gap-3">
                  <Button variant="outline" onClick={onClose}>
                    Cancel
                  </Button>
                  <Button onClick={generateTest} disabled={isGenerating}>
                    {isGenerating ? 'Generating...' : 'Generate Test'}
                  </Button>
                </div>
              </div>
            )}

            {/* Generated Test Step */}
            {step === 'generated' && (
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <CheckCircle className="w-5 h-5 text-green-600" />
                      Test Generated Successfully
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="bg-green-50 p-4 rounded-lg mb-4">
                      <p className="text-green-800">
                        Your test with {questions.length} questions has been generated based on the selected text.
                      </p>
                    </div>
                    
                    <div className="space-y-3">
                      <h4 className="font-medium">Question Preview:</h4>
                      {questions.slice(0, 2).map((question, index) => (
                        <div key={question.id} className="p-3 bg-gray-50 rounded-lg">
                          <p className="text-sm font-medium">
                            {index + 1}. {question.question}
                          </p>
                          <p className="text-xs text-gray-600 mt-1">
                            Type: {question.type === 'multiple_choice' ? 'Multiple Choice' : 'Short Answer'}
                          </p>
                        </div>
                      ))}
                      {questions.length > 2 && (
                        <p className="text-sm text-gray-600">
                          ...and {questions.length - 2} more questions
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>

                <div className="flex justify-end gap-3">
                  <Button variant="outline" onClick={resetTest}>
                    Configure New Test
                  </Button>
                  <Button onClick={startTest} className="flex items-center gap-2">
                    <Play className="w-4 h-4" />
                    Take Test
                  </Button>
                </div>
              </div>
            )}

            {/* Taking Test Step */}
            {step === 'taking' && (
              <div className="space-y-6">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h3 className="font-medium text-blue-900 mb-1">Taking Test</h3>
                  <p className="text-sm text-blue-800">
                    Answer all {questions.length} questions below. You can review and change your answers before submitting.
                  </p>
                </div>

                {questions.map((question, index) => (
                  <Card key={question.id}>
                    <CardContent className="pt-6">
                      <h4 className="font-medium mb-3">
                        {index + 1}. {question.question}
                      </h4>

                      {question.type === 'multiple_choice' ? (
                        <RadioGroup
                          value={userAnswers[question.id] || ''}
                          onValueChange={(value) => 
                            setUserAnswers(prev => ({...prev, [question.id]: value}))
                          }
                        >
                          {question.options?.map((option, optionIndex) => (
                            <div key={optionIndex} className="flex items-center space-x-2">
                              <RadioGroupItem 
                                value={option} 
                                id={`q${question.id}-${optionIndex}`}
                              />
                              <Label htmlFor={`q${question.id}-${optionIndex}`}>
                                {option}
                              </Label>
                            </div>
                          ))}
                        </RadioGroup>
                      ) : (
                        <Textarea
                          placeholder="Type your answer here..."
                          value={userAnswers[question.id] || ''}
                          onChange={(e) => 
                            setUserAnswers(prev => ({...prev, [question.id]: e.target.value}))
                          }
                          className="min-h-20"
                        />
                      )}
                    </CardContent>
                  </Card>
                ))}

                <div className="flex justify-end gap-3">
                  <Button variant="outline" onClick={() => setStep('generated')}>
                    Back to Preview
                  </Button>
                  <Button 
                    onClick={submitTest}
                    disabled={isSubmittingTest || Object.keys(userAnswers).length < questions.length}
                  >
                    {isSubmittingTest ? 'Grading...' : 'Submit Test'}
                  </Button>
                </div>
              </div>
            )}

            {/* Results Step */}
            {step === 'results' && testResult && (
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <CheckCircle className="w-5 h-5 text-green-600" />
                      Test Results
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="bg-gradient-to-r from-blue-50 to-green-50 p-6 rounded-lg mb-6">
                      <div className="text-center">
                        <div className="text-4xl font-bold text-gray-900 mb-2">
                          {Math.round((testResult.score / testResult.totalQuestions) * 100)}%
                        </div>
                        <p className="text-lg text-gray-700">
                          {testResult.score} out of {testResult.totalQuestions} correct
                        </p>
                        <div className="mt-3">
                          <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-gradient-to-r from-blue-500 to-green-500 transition-all duration-500"
                              style={{width: `${(testResult.score / testResult.totalQuestions) * 100}%`}}
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    <h4 className="font-medium mb-4">Detailed Feedback:</h4>
                    <div className="space-y-4">
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
                            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-white text-sm ${
                              feedback.isCorrect ? 'bg-green-500' : 'bg-red-500'
                            }`}>
                              {feedback.isCorrect ? '✓' : '✗'}
                            </div>
                            <div className="flex-1">
                              <p className="font-medium mb-2">Question {index + 1}</p>
                              <div className="text-sm space-y-2">
                                <p><span className="font-medium">Your answer:</span> {feedback.userAnswer}</p>
                                {!feedback.isCorrect && (
                                  <p><span className="font-medium">Correct answer:</span> {feedback.correctAnswer}</p>
                                )}
                                <p><span className="font-medium">Explanation:</span> {feedback.explanation}</p>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <div className="flex justify-end gap-3">
                  <Button variant="outline" onClick={resetTest}>
                    Generate New Test
                  </Button>
                  <Button onClick={onClose}>
                    Close
                  </Button>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}
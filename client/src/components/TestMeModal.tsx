import React, { useState } from 'react';
import { X } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { RadioGroup, RadioGroupItem } from './ui/radio-group';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { ScrollArea } from './ui/scroll-area';
import { Separator } from './ui/separator';
import { Slider } from './ui/slider';

interface Question {
  id: number;
  type: 'multiple_choice' | 'short_answer';
  question: string;
  options?: string[];
  correct_answer: string;
  explanation: string;
}

interface TestData {
  questions: Question[];
}

interface TestMeModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedText: string;
  isGenerating: boolean;
}

export default function TestMeModal({ isOpen, onClose, selectedText, isGenerating }: TestMeModalProps) {
  const [testData, setTestData] = useState<TestData | null>(null);
  const [userAnswers, setUserAnswers] = useState<{ [key: number]: string }>({});
  const [showResults, setShowResults] = useState(false);
  const [results, setResults] = useState<any>(null);
  const [isGrading, setIsGrading] = useState(false);
  const [currentStep, setCurrentStep] = useState<'generate' | 'take' | 'results'>('generate');
  const [isGeneratingTest, setIsGeneratingTest] = useState(false);
  const [difficulty, setDifficulty] = useState([5]); // Default difficulty level 5

  // Show generate step first to let user set difficulty
  React.useEffect(() => {
    if (isOpen && selectedText) {
      setCurrentStep('generate');
    }
  }, [isOpen, selectedText]);

  const getDifficultyLabel = (level: number) => {
    switch (level) {
      case 1: return "Remedial";
      case 2: return "Basic";
      case 3: return "Elementary";
      case 4: return "Intermediate";
      case 5: return "Standard";
      case 6: return "Advanced";
      case 7: return "Expert";
      case 8: return "Graduate";
      case 9: return "Professional";
      case 10: return "PhD Level";
      default: return "Standard";
    }
  };

  // Reset state when modal closes
  React.useEffect(() => {
    if (!isOpen) {
      setTestData(null);
      setUserAnswers({});
      setResults(null);
      setShowResults(false);
      setCurrentStep('generate');
      setIsGeneratingTest(false);
      setDifficulty([5]); // Reset to default
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleGenerateTest = async () => {
    setIsGeneratingTest(true);
    try {
      const response = await fetch('/api/generate-test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          selectedText,
          provider: 'openai',
          difficulty: difficulty[0]
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate test');
      }

      const data = await response.json();
      setTestData(data);
      setCurrentStep('take');
    } catch (error) {
      console.error('Error generating test:', error);
    } finally {
      setIsGeneratingTest(false);
    }
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
          questions: testData.questions,
          userAnswers,
          selectedText,
          provider: 'openai'
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to grade test');
      }

      const gradingResults = await response.json();
      setResults(gradingResults);
      setCurrentStep('results');
      setShowResults(true);
    } catch (error) {
      console.error('Error grading test:', error);
    } finally {
      setIsGrading(false);
    }
  };

  const handleAnswerChange = (questionId: number, answer: string) => {
    setUserAnswers(prev => ({
      ...prev,
      [questionId]: answer
    }));
  };

  const resetTest = () => {
    setTestData(null);
    setUserAnswers({});
    setResults(null);
    setShowResults(false);
    setCurrentStep('generate');
    setIsGeneratingTest(false);
    // Auto-generate new test
    handleGenerateTest();
  };

  const renderGenerateStep = () => (
    <div className="flex flex-col items-center justify-center py-8 space-y-6">
      <h3 className="text-lg font-semibold">Generate Test</h3>
      <p className="text-sm text-gray-600 text-center">
        Create a 5-question test (3 multiple choice, 2 short answer) based on your selected text.
      </p>
      
      {/* Difficulty Slider */}
      <div className="w-full max-w-sm space-y-3">
        <div className="text-center">
          <Label className="text-sm font-medium">
            Difficulty Level: {difficulty[0]} - {getDifficultyLabel(difficulty[0])}
          </Label>
        </div>
        <Slider
          value={difficulty}
          onValueChange={setDifficulty}
          min={1}
          max={10}
          step={1}
          className="w-full"
        />
        <div className="flex justify-between text-xs text-gray-500">
          <span>1 - Remedial</span>
          <span>5 - Standard</span>
          <span>10 - PhD Level</span>
        </div>
      </div>
      
      <Button 
        onClick={handleGenerateTest} 
        disabled={isGenerating}
        className="px-6 py-2"
      >
        {isGenerating ? 'Generating Test...' : 'Generate Test'}
      </Button>
      {isGenerating && (
        <div className="flex items-center space-x-2 text-sm text-blue-600">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
          <span>Creating your personalized test...</span>
        </div>
      )}
    </div>
  );

  const renderTestStep = () => {
    if (!testData) return null;

    const multipleChoiceQuestions = testData.questions.filter(q => q.type === 'multiple_choice');
    const shortAnswerQuestions = testData.questions.filter(q => q.type === 'short_answer');

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Take Test</h3>
          <Button onClick={resetTest} variant="outline" size="sm">
            Generate New Test
          </Button>
        </div>

        <ScrollArea className="h-96">
          <div className="space-y-6 pr-4">
            {/* Multiple Choice Questions */}
            <div>
              <h4 className="font-medium mb-4">Multiple Choice Questions</h4>
              {multipleChoiceQuestions.map((question, index) => (
                <Card key={question.id} className="mb-4">
                  <CardContent className="pt-4">
                    <p className="font-medium mb-3">
                      {index + 1}. {question.question}
                    </p>
                    <RadioGroup
                      value={userAnswers[question.id] || ''}
                      onValueChange={(value) => handleAnswerChange(question.id, value)}
                    >
                      {question.options?.map((option, optionIndex) => (
                        <div key={optionIndex} className="flex items-center space-x-2">
                          <RadioGroupItem value={option} id={`${question.id}-${optionIndex}`} />
                          <Label htmlFor={`${question.id}-${optionIndex}`}>{option}</Label>
                        </div>
                      ))}
                    </RadioGroup>
                  </CardContent>
                </Card>
              ))}
            </div>

            <Separator />

            {/* Short Answer Questions */}
            <div>
              <h4 className="font-medium mb-4">Short Answer Questions</h4>
              {shortAnswerQuestions.map((question, index) => (
                <Card key={question.id} className="mb-4">
                  <CardContent className="pt-4">
                    <p className="font-medium mb-3">
                      {multipleChoiceQuestions.length + index + 1}. {question.question}
                    </p>
                    <Textarea
                      placeholder="Enter your answer here..."
                      value={userAnswers[question.id] || ''}
                      onChange={(e) => handleAnswerChange(question.id, e.target.value)}
                      className="min-h-20"
                    />
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </ScrollArea>

        <div className="flex justify-end pt-4 border-t">
          <Button 
            onClick={handleSubmitTest} 
            disabled={isGrading || Object.keys(userAnswers).length === 0}
            className="relative"
          >
            {isGrading && (
              <div className="absolute left-3 animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            )}
            <span className={isGrading ? 'ml-6' : ''}>
              {isGrading ? 'Grading Test...' : 'Submit Test'}
            </span>
          </Button>
        </div>
      </div>
    );
  };

  const renderResultsStep = () => {
    if (!results || !testData) return null;

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Test Results</h3>
          <Button onClick={resetTest} variant="outline" size="sm">
            Take New Test
          </Button>
        </div>

        {/* Score Overview */}
        <Card>
          <CardHeader>
            <CardTitle>Overall Score</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-center">
              {results.score}/{results.totalQuestions} ({Math.round((results.score / results.totalQuestions) * 100)}%)
            </div>
          </CardContent>
        </Card>

        {/* Detailed Feedback */}
        <ScrollArea className="h-80">
          <div className="space-y-4 pr-4">
            {results.feedback?.map((item: any, index: number) => {
              const question = testData.questions.find(q => q.id === item.questionId);
              if (!question) return null;

              return (
                <Card key={item.questionId} className="mb-4">
                  <CardContent className="pt-4">
                    <div className="space-y-3">
                      <p className="font-medium">{index + 1}. {question.question}</p>
                      
                      <div className="bg-gray-50 p-3 rounded">
                        <p className="text-sm font-medium">Your Answer:</p>
                        <p className="text-sm">{item.userAnswer || 'No answer provided'}</p>
                      </div>

                      <div className="bg-green-50 p-3 rounded">
                        <p className="text-sm font-medium">Correct Answer:</p>
                        <p className="text-sm">{item.correctAnswer}</p>
                      </div>

                      <div className={`p-3 rounded ${item.isCorrect ? 'bg-green-100' : 'bg-red-100'}`}>
                        <p className="text-sm font-medium">
                          {item.isCorrect ? '✅ Correct' : '❌ Incorrect'}
                        </p>
                        <p className="text-sm mt-1">{item.explanation}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </ScrollArea>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-xl font-semibold">Test Me</h2>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Content */}
        <div className="flex-1 p-6 overflow-hidden">
          {currentStep === 'generate' && !isGeneratingTest && renderGenerateStep()}
          {isGeneratingTest && (
            <div className="flex flex-col items-center justify-center py-8 space-y-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <p className="text-lg font-semibold">Generating Your Test</p>
              <p className="text-sm text-gray-600 text-center">
                Creating 5 questions (3 multiple choice, 2 short answer) based on your selected text...
              </p>
            </div>
          )}
          {currentStep === 'take' && !isGeneratingTest && renderTestStep()}
          {currentStep === 'results' && renderResultsStep()}
        </div>
      </div>
    </div>
  );
}
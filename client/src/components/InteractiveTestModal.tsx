import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Loader2, TestTube, CheckCircle, XCircle, RefreshCw, Trophy, BookOpen } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

interface MultipleChoiceQuestion {
  question: string;
  options: string[];
  correctAnswer: string;
  explanation: string;
}

interface ShortAnswerQuestion {
  question: string;
  sampleAnswer: string;
  points: number;
}

interface TestData {
  multipleChoice: MultipleChoiceQuestion[];
  shortAnswer: ShortAnswerQuestion[];
}

interface InteractiveTestModalProps {
  isOpen: boolean;
  onClose: () => void;
  document: any;
}

export default function InteractiveTestModal({ isOpen, onClose, document }: InteractiveTestModalProps) {
  const [testData, setTestData] = useState<TestData | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [userAnswers, setUserAnswers] = useState<{
    multipleChoice: string[];
    shortAnswer: string[];
  }>({
    multipleChoice: [],
    shortAnswer: []
  });
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [testResults, setTestResults] = useState<{
    score: number;
    totalPoints: number;
    mcScore: number;
    feedback: string[];
  } | null>(null);
  const [currentStep, setCurrentStep] = useState<'loading' | 'taking' | 'results'>('loading');

  const { toast } = useToast();

  const generateTest = async () => {
    if (!document) return;

    setIsGenerating(true);
    setCurrentStep('loading');
    setTestData(null);
    setIsSubmitted(false);
    setTestResults(null);
    setUserAnswers({
      multipleChoice: [],
      shortAnswer: []
    });

    try {
      const response = await apiRequest('POST', '/api/generate-interactive-test', {
        documentId: document.id,
        provider: 'openai'
      });

      if (response.ok) {
        const data = await response.json();
        setTestData(data.test);
        setCurrentStep('taking');
        
        // Initialize answer arrays
        setUserAnswers({
          multipleChoice: new Array(data.test.multipleChoice.length).fill(''),
          shortAnswer: new Array(data.test.shortAnswer.length).fill('')
        });

        toast({
          title: "Test Generated",
          description: "Your test is ready! 3 multiple choice + 2 short answer questions.",
        });
      } else {
        throw new Error('Failed to generate test');
      }
    } catch (error) {
      console.error('Test generation error:', error);
      toast({
        title: "Generation Failed",
        description: "Unable to create test. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleMCAnswer = (questionIndex: number, answer: string) => {
    const newAnswers = [...userAnswers.multipleChoice];
    newAnswers[questionIndex] = answer;
    setUserAnswers(prev => ({
      ...prev,
      multipleChoice: newAnswers
    }));
  };

  const handleSAAnswer = (questionIndex: number, answer: string) => {
    const newAnswers = [...userAnswers.shortAnswer];
    newAnswers[questionIndex] = answer;
    setUserAnswers(prev => ({
      ...prev,
      shortAnswer: newAnswers
    }));
  };

  const submitTest = () => {
    if (!testData) return;

    // Grade multiple choice questions
    let mcCorrect = 0;
    const feedback: string[] = [];

    testData.multipleChoice.forEach((question, index) => {
      const userAnswer = userAnswers.multipleChoice[index];
      const isCorrect = userAnswer === question.correctAnswer;
      
      if (isCorrect) {
        mcCorrect++;
        feedback.push(`✓ Question ${index + 1}: Correct! ${question.explanation}`);
      } else {
        feedback.push(`✗ Question ${index + 1}: Incorrect. You answered ${userAnswer || 'Nothing'}, correct answer is ${question.correctAnswer}. ${question.explanation}`);
      }
    });

    // For short answers, provide sample answer comparison
    testData.shortAnswer.forEach((question, index) => {
      const userAnswer = userAnswers.shortAnswer[index + 3]; // Offset by MC questions
      if (userAnswer && userAnswer.trim()) {
        feedback.push(`Short Answer ${index + 1}: Your answer: "${userAnswer.trim()}". Sample answer: "${question.sampleAnswer}"`);
      } else {
        feedback.push(`Short Answer ${index + 1}: No answer provided. Sample answer: "${question.sampleAnswer}"`);
      }
    });

    const mcScore = Math.round((mcCorrect / testData.multipleChoice.length) * 100);
    const totalPoints = mcCorrect * 10; // 10 points per MC question

    setTestResults({
      score: mcScore,
      totalPoints: totalPoints,
      mcScore: mcCorrect,
      feedback
    });

    setIsSubmitted(true);
    setCurrentStep('results');

    toast({
      title: "Test Submitted!",
      description: `You scored ${mcScore}% on multiple choice questions.`,
    });
  };

  // Auto-generate test when modal opens
  useEffect(() => {
    if (isOpen && document && !testData && !isGenerating) {
      generateTest();
    }
  }, [isOpen, document]);

  const canSubmit = testData && 
    userAnswers.multipleChoice.every(answer => answer !== '') &&
    userAnswers.shortAnswer.every(answer => answer.trim() !== '');

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3 text-xl">
            <TestTube className="w-6 h-6" />
            Interactive Test - {document?.originalName}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto">
          {/* Loading State */}
          {currentStep === 'loading' && (
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
              <h3 className="text-lg font-medium">Generating Your Test...</h3>
              <p className="text-sm text-gray-600">Creating 3 multiple choice + 2 short answer questions</p>
            </div>
          )}

          {/* Test Taking State */}
          {currentStep === 'taking' && testData && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <Badge variant="outline" className="text-sm">
                  5 Questions • 3 Multiple Choice • 2 Short Answer
                </Badge>
                <Button 
                  onClick={generateTest} 
                  variant="outline" 
                  size="sm"
                  disabled={isGenerating}
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  New Test
                </Button>
              </div>

              {/* Multiple Choice Questions */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  Multiple Choice Questions
                </h3>

                {testData.multipleChoice.map((question, index) => (
                  <Card key={index}>
                    <CardHeader>
                      <CardTitle className="text-base">
                        Question {index + 1}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <p className="text-sm">{question.question}</p>
                      
                      <RadioGroup
                        value={userAnswers.multipleChoice[index] || ''}
                        onValueChange={(value) => handleMCAnswer(index, value)}
                      >
                        {question.options.map((option, optIndex) => (
                          <div key={optIndex} className="flex items-center space-x-2">
                            <RadioGroupItem value={option.charAt(0)} id={`q${index}-opt${optIndex}`} />
                            <Label htmlFor={`q${index}-opt${optIndex}`} className="text-sm">
                              {option}
                            </Label>
                          </div>
                        ))}
                      </RadioGroup>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Short Answer Questions */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-blue-600" />
                  Short Answer Questions
                </h3>

                {testData.shortAnswer.map((question, index) => (
                  <Card key={index}>
                    <CardHeader>
                      <CardTitle className="text-base">
                        Question {index + 4}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <p className="text-sm">{question.question}</p>
                      <Textarea
                        placeholder="Type your answer here..."
                        value={userAnswers.shortAnswer[index] || ''}
                        onChange={(e) => handleSAAnswer(index, e.target.value)}
                        rows={4}
                        className="w-full"
                      />
                      <Badge variant="outline" className="text-xs">
                        {question.points} points
                      </Badge>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <div className="flex justify-center pt-4">
                <Button 
                  onClick={submitTest}
                  disabled={!canSubmit}
                  className="bg-green-600 hover:bg-green-700 text-white px-8 py-2"
                >
                  <Trophy className="w-4 h-4 mr-2" />
                  Submit Test
                </Button>
              </div>
            </div>
          )}

          {/* Results State */}
          {currentStep === 'results' && testResults && (
            <div className="space-y-6">
              <div className="text-center space-y-4">
                <Trophy className="w-12 h-12 mx-auto text-yellow-500" />
                <h3 className="text-2xl font-bold">Test Results</h3>
                
                <div className="flex justify-center space-x-8">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-blue-600">{testResults.score}%</div>
                    <div className="text-sm text-gray-600">Multiple Choice Score</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-green-600">{testResults.mcScore}/3</div>
                    <div className="text-sm text-gray-600">Questions Correct</div>
                  </div>
                </div>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Detailed Feedback</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {testResults.feedback.map((item, index) => (
                    <div 
                      key={index} 
                      className={`p-3 rounded-lg text-sm ${
                        item.startsWith('✓') 
                          ? 'bg-green-50 text-green-800 border border-green-200' 
                          : item.startsWith('✗')
                          ? 'bg-red-50 text-red-800 border border-red-200'
                          : 'bg-blue-50 text-blue-800 border border-blue-200'
                      }`}
                    >
                      {item}
                    </div>
                  ))}
                </CardContent>
              </Card>

              <div className="flex justify-center space-x-4">
                <Button 
                  onClick={generateTest}
                  disabled={isGenerating}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Take New Test
                </Button>
                <Button variant="outline" onClick={onClose}>
                  Close
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
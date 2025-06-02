import { Bot, Sprout, Lightbulb, LayoutDashboard, LucideSprout, ListCheckIcon, Leaf, Settings } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { ScrollArea } from '../../components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '../../components/ui/avatar';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { FaHandshake } from 'react-icons/fa';
import Sidebar from '../../components/ui/sidebar';

const AdvisoryPage = () => {
  const { t } = useTranslation(); // Hook for translations
  const navigate = useNavigate();

  const getMenuItems = () => {
    return [
      {
        label: t('dashboard'),
        onClick: () => navigate('/farmer/homePage'),
        icon: <LayoutDashboard className="text-white" />
      },
      {
        label: t('addProduct'),
        onClick: () => navigate('/farmer/add-product'),
        icon: <LucideSprout className="text-white" />
      },
      {
        label: t('orders'),
        onClick: () => navigate('/farmer/orders'),
        icon: <ListCheckIcon className="text-white" />
      },
      {
        label: t('biding'),
        onClick: () => navigate('/farmer/biding'),
        icon: <FaHandshake className="text-white" />
      },
      {
        label: t('advisory'),
        onClick: () => navigate('/farmer/advisory'),
        icon: <Leaf className="text-white" />
      },
      {
        label: t('settings'),
        onClick: () => navigate('/farmer/settings'),
        icon: <Settings className="text-white" />
      },
    ];
  };

  return (
    <div className="bg-gray-50 min-h-screen bg-gradient-to-b from-green-0 to-green-100">
      <Sidebar menuItems={getMenuItems()} />
      {/* Header */}
      <div className="pt-12 max-w-7xl mx-auto">
        <header className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-800">{t('advisory')}</h1>
        </header>

        {/* Main Content */}
        <Tabs defaultValue="ideas" className="space-y-6">
          <TabsList className="grid w-xl grid-cols-3 gap-6">
            <TabsTrigger value="ideas" className="bg-green-500 hover:bg-green-600">
              <Lightbulb className="w-4 h-4 mr-2" />
              {t('ideas')}
            </TabsTrigger>
            <TabsTrigger value="consultation" className="bg-green-500 hover:bg-green-600">
              <Bot className="w-4 h-4 mr-2" />
              {t('consultation')}
            </TabsTrigger>
            <TabsTrigger value="solutions" className="bg-green-500 hover:bg-green-600">
              <Sprout className="w-4 h-4 mr-2" />
              {t('solutions')}
            </TabsTrigger>
          </TabsList>

          {/* Ideas Tab */}
          <TabsContent value="ideas">
            <ScrollArea className="h-[600px] w-full rounded-md">
              <div className="space-y-4">
                <Card className="border-gray-300 shadow-sm hover:shadow-lg transition-shadow duration-300">
                  <CardHeader className="flex flex-row items-center space-x-4">
                    <Avatar>
                      <AvatarImage src="/path-to-expert-image.jpg" alt="Expert" />
                      <AvatarFallback className="bg-blue-200">{t('expertFallback')}</AvatarFallback>
                    </Avatar>
                    <div>
                      <CardTitle className="text-sm font-bold">{t('drSharma')}</CardTitle>
                      <p className="text-xs text-gray-500">{t('cropExpert')} • {t('time2mAgo')}</p>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-md">{t('cropRotationAdvice')}</p>
                  </CardContent>
                </Card>
                <Card className="border-gray-300 shadow-sm hover:shadow-lg transition-shadow duration-300">
                  <CardHeader className="flex flex-row items-center space-x-4">
                    <Avatar>
                      <AvatarImage src="/path-to-ai-image.jpg" alt="AI Bot" />
                      <AvatarFallback className="bg-green-200">{t('aiBotFallback')}</AvatarFallback>
                    </Avatar>
                    <div>
                      <CardTitle className="text-sm font-bold">{t('aiAdvisoryBot')}</CardTitle>
                      <p className="text-xs text-gray-500">{t('time10mAgo')}</p>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-md">{t('intercroppingAdvice')}</p>
                  </CardContent>
                </Card>
              </div>
            </ScrollArea>
          </TabsContent>

          {/* Consultation Tab */}
          <TabsContent value="consultation">
            <ScrollArea className="h-[600px] w-full rounded-md">
              <div className="space-y-4">
                <Card className="border-gray-300 shadow-sm hover:shadow-lg transition-shadow duration-300">
                  <CardHeader className="flex flex-row items-center space-x-4">
                    <Avatar>
                      <AvatarImage src="/path-to-expert-image.jpg" alt="Expert" />
                      <AvatarFallback className="bg-blue-200">{t('expertFallback')}</AvatarFallback>
                    </Avatar>
                    <div>
                      <CardTitle className="text-sm font-bold">{t('drPatel')}</CardTitle>
                      <p className="text-xs text-gray-500">{t('cropConsultant')} • {t('time1hAgo')}</p>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-md">{t('soilTestAdvice')}</p>
                  </CardContent>
                </Card>
                <Card className="border-gray-300 shadow-sm hover:shadow-lg transition-shadow duration-300">
                  <CardHeader className="flex flex-row items-center space-x-4">
                    <Avatar>
                      <AvatarImage src="/path-to-ai-image.jpg" alt="AI Bot" />
                      <AvatarFallback className="bg-green-200">{t('aiBotFallback')}</AvatarFallback>
                    </Avatar>
                    <div>
                      <CardTitle className="text-sm font-bold">{t('aiAdvisoryBot')}</CardTitle>
                      <p className="text-xs text-gray-500">{t('time2hAgo')}</p>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-md">{t('pestManagementAdvice')}</p>
                  </CardContent>
                </Card>
              </div>
            </ScrollArea>
          </TabsContent>

          {/* Solutions Tab */}
          <TabsContent value="solutions">
            <ScrollArea className="h-[600px] w-full rounded-md">
              <div className="space-y-4">
                <Card className="border-gray-300 shadow-sm hover:shadow-lg transition-shadow duration-300">
                  <CardHeader className="flex flex-row items-center space-x-4">
                    <Avatar>
                      <AvatarImage src="/path-to-expert-image.jpg" alt="Expert" />
                      <AvatarFallback className="bg-blue-200">{t('expertFallback')}</AvatarFallback>
                    </Avatar>
                    <div>
                      <CardTitle className="text-sm font-bold">{t('drKumar')}</CardTitle>
                      <p className="text-xs text-gray-500">{t('cropExpert')} • {t('time30mAgo')}</p>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-md">{t('wheatYellowingSolution')}</p>
                  </CardContent>
                </Card>
                <Card className="border-gray-300 shadow-sm hover:shadow-lg transition-shadow duration-300">
                  <CardHeader className="flex flex-row items-center space-x-4">
                    <Avatar>
                      <AvatarImage src="/path-to-ai-image.jpg" alt="AI Bot" />
                      <AvatarFallback className="bg-green-200">{t('aiBotFallback')}</AvatarFallback>
                    </Avatar>
                    <div>
                      <CardTitle className="text-sm font-bold">{t('aiAdvisoryBot')}</CardTitle>
                      <p className="text-xs text-gray-500">{t('time45mAgo')}</p>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-md">{t('drainageSolution')}</p>
                  </CardContent>
                </Card>
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default AdvisoryPage;
import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { Building2, Crown, User, Users, ChevronDown, ChevronUp, Mail, Briefcase } from 'lucide-react';

interface Person {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  jobTitle?: string;
  role?: string;
  department?: { id: string; name: string };
}

interface OrgChartData {
  employee: Person;
  department: {
    id: string;
    name: string;
    head?: Person;
    parent?: {
      id: string;
      name: string;
      head?: Person;
    };
  };
  directManager?: Person;
  managerChain: Person[];
  colleagues: Person[];
}

function PersonCard({
  person,
  role,
  highlight = false,
  showDepartment = false
}: {
  person: Person;
  role: string;
  highlight?: boolean;
  showDepartment?: boolean;
}) {
  return (
    <div className={`
      bg-white rounded-xl shadow-md border-2 p-4 min-w-[240px] transition-all duration-200
      ${highlight ? 'border-blue-500 ring-2 ring-blue-100' : 'border-gray-100 hover:border-gray-200'}
    `}>
      <div className="flex items-start gap-3">
        <div className={`
          w-12 h-12 rounded-full flex items-center justify-center text-lg font-semibold shrink-0
          ${highlight ? 'bg-blue-600 text-white' : 'bg-gradient-to-br from-blue-500 to-purple-600 text-white'}
        `}>
          {person.firstName[0]}{person.lastName[0]}
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-gray-900 truncate">
            {person.firstName} {person.lastName}
          </p>
          {person.jobTitle && (
            <p className="text-sm text-gray-600 truncate flex items-center gap-1">
              <Briefcase className="h-3 w-3" />
              {person.jobTitle}
            </p>
          )}
          <p className="text-xs text-gray-400 truncate flex items-center gap-1 mt-1">
            <Mail className="h-3 w-3" />
            {person.email}
          </p>
          {showDepartment && person.department && (
            <p className="text-xs text-purple-600 mt-1 flex items-center gap-1">
              <Building2 className="h-3 w-3" />
              {person.department.name}
            </p>
          )}
        </div>
      </div>
      <div className={`
        mt-3 text-xs font-medium px-2 py-1 rounded-full text-center
        ${role === 'You' ? 'bg-blue-100 text-blue-700' :
          role.includes('Head') ? 'bg-amber-100 text-amber-700' :
          role === 'Direct Manager' ? 'bg-green-100 text-green-700' :
          'bg-gray-100 text-gray-600'}
      `}>
        {role}
      </div>
    </div>
  );
}

function TreeConnector({ direction }: { direction: 'up' | 'down' | 'horizontal' }) {
  if (direction === 'up') {
    return (
      <div className="flex flex-col items-center">
        <div className="w-0.5 h-8 bg-gradient-to-b from-gray-300 to-gray-400"></div>
        <div className="w-3 h-3 rounded-full bg-gray-400 -mt-1"></div>
      </div>
    );
  }
  if (direction === 'down') {
    return (
      <div className="flex flex-col items-center">
        <div className="w-3 h-3 rounded-full bg-blue-400"></div>
        <div className="w-0.5 h-8 bg-gradient-to-b from-blue-400 to-blue-300 -mt-1"></div>
      </div>
    );
  }
  return (
    <div className="w-16 h-0.5 bg-gray-300"></div>
  );
}

export default function OrgChartPage() {
  const [data, setData] = useState<OrgChartData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showColleagues, setShowColleagues] = useState(false);

  useEffect(() => {
    loadOrgChart();
  }, []);

  const loadOrgChart = async () => {
    try {
      const result = await api.getMyOrgChart();
      setData(result);
    } catch (err) {
      console.error('Failed to load org chart:', err);
      setError('Failed to load organization chart');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading your organization chart...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <p className="text-red-600">{error || 'No data available'}</p>
        </div>
      </div>
    );
  }

  const reversedManagerChain = [...data.managerChain].reverse();

  return (
    <div className="p-8 bg-gradient-to-br from-gray-50 to-blue-50 min-h-screen">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center justify-center gap-3">
            <Building2 className="h-8 w-8 text-blue-600" />
            Your Organization
          </h1>
          <p className="text-gray-600 mt-2">
            See where you fit in the {data.department.name} team
          </p>
        </div>

        <div className="flex flex-col items-center space-y-2">
          {data.department.parent?.head && (
            <>
              <div className="text-center mb-2">
                <span className="inline-flex items-center gap-2 text-sm font-medium text-purple-600 bg-purple-50 px-3 py-1 rounded-full">
                  <Building2 className="h-4 w-4" />
                  {data.department.parent.name}
                </span>
              </div>
              <PersonCard
                person={data.department.parent.head}
                role={`${data.department.parent.name} Head`}
              />
              <TreeConnector direction="down" />
            </>
          )}

          {data.department.head && data.department.head.id !== data.employee.id && (
            <>
              <div className="text-center mb-2">
                <span className="inline-flex items-center gap-2 text-sm font-medium text-blue-600 bg-blue-50 px-3 py-1 rounded-full">
                  <Crown className="h-4 w-4" />
                  {data.department.name} Department
                </span>
              </div>
              <PersonCard
                person={data.department.head}
                role="Department Head"
              />
              <TreeConnector direction="down" />
            </>
          )}

          {reversedManagerChain.length > 0 && (
            <div className="flex flex-col items-center space-y-2">
              {reversedManagerChain.map((manager, index) => (
                <div key={manager.id} className="flex flex-col items-center">
                  {index > 0 && <TreeConnector direction="down" />}
                  <PersonCard
                    person={manager}
                    role={index === reversedManagerChain.length - 1 ? 'Direct Manager' : 'Senior Manager'}
                    showDepartment={true}
                  />
                </div>
              ))}
              <TreeConnector direction="down" />
            </div>
          )}

          <div className="relative">
            <div className="absolute -inset-4 bg-blue-100 rounded-2xl opacity-50"></div>
            <PersonCard
              person={data.employee}
              role="You"
              highlight={true}
            />
          </div>

          {data.colleagues.length > 0 && (
            <>
              <button
                onClick={() => setShowColleagues(!showColleagues)}
                className="flex items-center gap-2 text-gray-600 hover:text-blue-600 transition-colors mt-6"
              >
                <Users className="h-5 w-5" />
                <span>{data.colleagues.length} Colleagues</span>
                {showColleagues ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </button>

              {showColleagues && (
                <div className="mt-4 w-full">
                  <div className="flex flex-wrap justify-center gap-4 p-6 bg-white/50 rounded-2xl border border-gray-200">
                    {data.colleagues.map((colleague) => (
                      <PersonCard
                        key={colleague.id}
                        person={colleague}
                        role="Colleague"
                      />
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        <div className="mt-12 bg-white rounded-2xl shadow-md p-6 border border-gray-100">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Building2 className="h-5 w-5 text-blue-600" />
            Department Overview
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center">
                  <Building2 className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="text-sm text-blue-600 font-medium">Your Department</p>
                  <p className="text-lg font-bold text-gray-900">{data.department.name}</p>
                </div>
              </div>
            </div>

            {data.department.head && (
              <div className="bg-gradient-to-br from-amber-50 to-amber-100 rounded-xl p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-amber-500 flex items-center justify-center">
                    <Crown className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <p className="text-sm text-amber-600 font-medium">Department Head</p>
                    <p className="text-lg font-bold text-gray-900">
                      {data.department.head.firstName} {data.department.head.lastName}
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-green-600 flex items-center justify-center">
                  <Users className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="text-sm text-green-600 font-medium">Team Size</p>
                  <p className="text-lg font-bold text-gray-900">
                    {data.colleagues.length + 1} members
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

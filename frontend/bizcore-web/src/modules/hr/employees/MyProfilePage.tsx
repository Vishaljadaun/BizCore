import { useState, useEffect } from 'react';
import { useAuthStore }  from '../../../store/authStore';
import { hrApi }         from '../../../api/hrApi';
import type {
  EmployeeResponse,
  LeaveBalanceResponse,
  AttendanceResponse,
}                        from '../../../types';
import Button            from '../../../components/shared/Button';

const MyProfilePage = () => {
  const { user }       = useAuthStore();
  const [employee,     setEmployee]     =
    useState<EmployeeResponse | null>(null);
  const [balances,     setBalances]     =
    useState<LeaveBalanceResponse[]>([]);
  const [todayAtt,     setTodayAtt]     =
    useState<AttendanceResponse | null>(null);
  const [isClockedIn,  setIsClockedIn]  = useState(false);
  const [isLoading,    setIsLoading]    = useState(true);
  const [noProfile,    setNoProfile]    = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);

        // Get my own employee profile
        const empData = await hrApi.getMyProfile();
        setEmployee(empData);

        const [balanceData, attData] = await Promise.all([
          hrApi.getLeaveBalances(empData.id),
          hrApi.getAttendance({
            employeeId: empData.id,
            date: new Date().toISOString().split('T')[0],
            pageSize: 1,
          }),
        ]);

        setBalances(balanceData);

        if (attData.items.length > 0) {
          setTodayAtt(attData.items[0]);
          setIsClockedIn(!attData.items[0].clockOut);
        }
      } catch {
        setNoProfile(true);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleClockIn = async () => {
    try {
      setActionLoading(true);
      const result = await hrApi.selfClockIn();
      setTodayAtt(result);
      setIsClockedIn(true);
    } finally {
      setActionLoading(false);
    }
  };

  const handleClockOut = async () => {
    try {
      setActionLoading(true);
      const result = await hrApi.selfClockOut();
      setTodayAtt(result);
      setIsClockedIn(false);
    } finally {
      setActionLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <div className="w-8 h-8 border-4 border-primary-600
          border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (noProfile || !employee) {
    return (
      <div className="bg-yellow-50 border border-yellow-200
        rounded-xl p-8 text-center">
        <div className="text-4xl mb-3">⚠️</div>
        <h3 className="font-semibold text-yellow-800">
          No Employee Profile Linked
        </h3>
        <p className="text-yellow-700 text-sm mt-2">
          Your account is not linked to an employee profile.
          Please contact HR to link your profile.
        </p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">
        My Profile
      </h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Left: Profile Card */}
        <div className="bg-white rounded-2xl border
          border-gray-100 shadow-sm p-6">

          <div className="w-20 h-20 rounded-2xl
            bg-primary-600 flex items-center
            justify-center mx-auto mb-4">
            <span className="text-white text-2xl font-bold">
              {employee.firstName[0]}{employee.lastName[0]}
            </span>
          </div>

          <div className="text-center">
            <h2 className="text-xl font-bold text-gray-900">
              {employee.fullName}
            </h2>
            <p className="text-gray-500 text-sm mt-1">
              {employee.designation}
            </p>
            <span className="inline-block mt-2 px-3 py-1
              bg-primary-100 text-primary-700 rounded-full
              text-xs font-medium">
              {employee.employeeCode}
            </span>
          </div>

          <div className="mt-6 space-y-3">
            <div className="flex items-center gap-3
              text-sm text-gray-600">
              <span>🏢</span>
              <span>{employee.departmentName}</span>
            </div>
            <div className="flex items-center gap-3
              text-sm text-gray-600">
              <span>✉️</span>
              <span>{employee.email}</span>
            </div>
            {employee.phone && (
              <div className="flex items-center gap-3
                text-sm text-gray-600">
                <span>📱</span>
                <span>{employee.phone}</span>
              </div>
            )}
            <div className="flex items-center gap-3
              text-sm text-gray-600">
              <span>📅</span>
              <span>Joined: {new Date(employee.joiningDate)
                .toLocaleDateString('en-IN', {
                  day: '2-digit', month: 'short', year: 'numeric'
                })}</span>
            </div>
          </div>
        </div>

        {/* Right: Actions + Info */}
        <div className="lg:col-span-2 space-y-6">

          {/* Today's Attendance Card */}
          <div className="bg-white rounded-2xl border
            border-gray-100 shadow-sm p-6">
            <h3 className="font-semibold text-gray-900 mb-4">
              Today's Attendance
            </h3>

            {todayAtt ? (
              <div className="flex items-center
                justify-between">
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <span className="text-green-500">●</span>
                    <div>
                      <p className="text-xs text-gray-500">
                        Clock In
                      </p>
                      <p className="font-semibold text-gray-900">
                        {new Date(todayAtt.clockIn)
                          .toLocaleTimeString('en-IN', {
                            hour:   '2-digit',
                            minute: '2-digit',
                          })}
                      </p>
                    </div>
                  </div>

                  {todayAtt.clockOut && (
                    <div className="flex items-center gap-3">
                      <span className="text-red-400">●</span>
                      <div>
                        <p className="text-xs text-gray-500">
                          Clock Out
                        </p>
                        <p className="font-semibold text-gray-900">
                          {new Date(todayAtt.clockOut)
                            .toLocaleTimeString('en-IN', {
                              hour:   '2-digit',
                              minute: '2-digit',
                            })}
                        </p>
                      </div>
                    </div>
                  )}

                  {todayAtt.workingHours && (
                    <p className="text-sm text-gray-600 mt-2">
                      ⏱ {todayAtt.workingHours}h worked today
                    </p>
                  )}
                </div>

                <div className="text-right">
                  <span className={`px-3 py-1.5 rounded-xl
                    text-sm font-medium
                    ${todayAtt.status === 'Present'
                      ? 'bg-green-100 text-green-700'
                      : todayAtt.status === 'Late'
                      ? 'bg-yellow-100 text-yellow-700'
                      : 'bg-orange-100 text-orange-700'
                    }`}>
                    {todayAtt.status}
                  </span>

                  {isClockedIn && (
                    <div className="mt-3">
                      <Button
                        variant="danger"
                        size="sm"
                        isLoading={actionLoading}
                        onClick={handleClockOut}
                      >
                        🔴 Clock Out
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex items-center
                justify-between">
                <p className="text-gray-500 text-sm">
                  Not clocked in yet today
                </p>
                <Button
                  size="sm"
                  isLoading={actionLoading}
                  onClick={handleClockIn}
                >
                  🟢 Clock In
                </Button>
              </div>
            )}
          </div>

          {/* Leave Balances */}
          <div className="bg-white rounded-2xl border
            border-gray-100 shadow-sm p-6">
            <h3 className="font-semibold text-gray-900 mb-4">
              Leave Balance {new Date().getFullYear()}
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3
              gap-4">
              {balances.map((bal) => (
                <div key={bal.leaveTypeId}
                  className="bg-gray-50 rounded-xl p-4">
                  <p className="text-xs text-gray-500 mb-2">
                    {bal.leaveTypeName}
                  </p>
                  <div className="flex items-end gap-1">
                    <span className="text-2xl font-bold
                      text-gray-900">
                      {bal.remainingDays}
                    </span>
                    <span className="text-sm text-gray-400
                      mb-0.5">
                      /{bal.totalDays} days
                    </span>
                  </div>
                  <div className="mt-2 h-1.5 bg-gray-200
                    rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary-500
                        rounded-full"
                      style={{
                        width: `${(bal.remainingDays /
                          bal.totalDays) * 100}%`
                      }}
                    />
                  </div>
                  <p className="text-xs text-gray-400 mt-1">
                    {bal.usedDays} used
                  </p>
                </div>
              ))}

              {balances.length === 0 && (
                <p className="text-sm text-gray-400
                  col-span-3 text-center py-4">
                  No leave balance records found
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MyProfilePage;
import { invoke } from '@tauri-apps/api/core';
import { useContext, useState, useEffect } from 'react';

// import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Typography from '@mui/material/Typography';

import { DashboardContent } from 'src/layouts/dashboard';
import { SchoolContext } from 'src/contexts/SchoolContext';
import { _posts, _tasks, _traffic, _timeline } from 'src/_mock';

import Config from "../../../../config";
// import { AnalyticsNews } from '../analytics-news';
// import { AnalyticsTasks } from '../analytics-tasks';
import { AnalyticsClassSummary } from '../analytics-class-summary';
// import { AnalyticsOrderTimeline } from '../analytics-order-timeline';
// import { AnalyticsCurrentVisits } from '../analytics-current-visits';
// import { AnalyticsWebsiteVisits } from '../analytics-website-visits';
// import { AnalyticsTrafficBySite } from '../analytics-traffic-by-site';
// import { AnalyticsCurrentSubject } from '../analytics-current-subject';
// import { AnalyticsConversionRates } from '../analytics-conversion-rates';
import { AnalyticsWidgetSummary, SchoolBanner } from '../analytics-widget-summary';

// ----------------------------------------------------------------------

type StudentData = {
  total: number;
  active: number;
  inactive: number;
  currentYear: number;
  trend: number[];
  growthPercent: number;
  male: number;
  female: number;
  otherGender: number;
};
function StudentsWidget() {
  const [loading, setLoading] = useState(true);
  const [studentData, setStudentData] = useState<StudentData>({
    total: 0,
    active: 0,
    inactive: 0,
    currentYear: 0,
    trend: [],
    growthPercent: 0,
    male: 0,
    female: 0,
    otherGender: 0,
  });

  useEffect(() => {
    const fetchStudents = async () => {
      try {
        const students = await invoke<any[]>('get_all_student1');
        const currentYear = '2024-2025';

        const summaryData = students.reduce(
          (acc, student) => ({
            total: acc.total + 1,
            active: acc.active + (student.status === 'active' ? 1 : 0),
            inactive: acc.inactive + (student.status !== 'active' ? 1 : 0),
            currentYear: acc.currentYear + (student.academic_year === currentYear ? 1 : 0),
            male: acc.male + (student.gender === 'male' ? 1 : 0),
            female: acc.female + (student.gender === 'female' ? 1 : 0),
            otherGender: acc.otherGender + (!['male', 'female'].includes(student.gender) ? 1 : 0),
          }),
          {
            total: 0,
            active: 0,
            inactive: 0,
            currentYear: 0,
            male: 0,
            female: 0,
            otherGender: 0
          }
        );

        const previousTotal = students.filter(s =>
          s.created_at && new Date(s.created_at).getMonth() < new Date().getMonth()
        ).length;
        const growthPercent = previousTotal ? ((summaryData.total - previousTotal) / previousTotal) * 100 : 0;

        const last7Days = Array.from({ length: 7 }, (_, i) => {
          const date = new Date();
          date.setDate(date.getDate() - i);
          return date;
        }).reverse();

        const trend = last7Days.map(date =>
          students.filter(s =>
            s.created_at && new Date(s.created_at).toDateString() === date.toDateString()
          ).length + (date < new Date() ? summaryData.total : 0)
        );

        setStudentData({
          ...summaryData,
          trend,
          growthPercent,
        });
      } catch (error) {
        console.error('Error fetching students:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStudents();
  }, []);

  if (loading) {
    return null;
  }

  return (
    <AnalyticsWidgetSummary
      title="Number of Students"
      percent={studentData.growthPercent}
      total={studentData.total}
      color="secondary"  // Using the same secondary color as your "New users" widget
      icon={<img alt="Total Students" src="/assets/icons/glass/ic-glass-users.svg" />}
      chart={{
        categories: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
        series: studentData.trend,
      }}
    />
  );
}

type ClassData = {
  total: number;
  active: number;
  inactive: number;
  currentYear: number;
  trend: number[];
  growthPercent: number;
};
function ClassesWidget() {
  const [loading, setLoading] = useState(true);
  const [classData, setClassData] = useState<ClassData>({
    total: 0,
    active: 0,
    inactive: 0,
    currentYear: 0,
    trend: [],
    growthPercent: 0,
  });

  useEffect(() => {
    const fetchClasses = async () => {
      try {
        const classes = await invoke<any[]>('get_all_classes');
        const currentYear = '2024-2025'; // Current academic year

        const summaryData = classes.reduce(
          (acc, cls) => ({
            total: acc.total + 1,
            active: acc.active + (cls.status === 'active' ? 1 : 0),
            inactive: acc.inactive + (cls.status !== 'active' ? 1 : 0),
            currentYear: acc.currentYear + (cls.academic_year === currentYear ? 1 : 0),
          }),
          { total: 0, active: 0, inactive: 0, currentYear: 0 }
        );

        // Calculate growth percentage
        const previousTotal = classes.filter(c =>
          c.created_at && new Date(c.created_at).getMonth() < new Date().getMonth()
        ).length;
        const growthPercent = previousTotal ? ((summaryData.total - previousTotal) / previousTotal) * 100 : 0;

        // Create trend data (last 7 days)
        const last7Days = Array.from({ length: 7 }, (_, i) => {
          const date = new Date();
          date.setDate(date.getDate() - i);
          return date;
        }).reverse();

        const trend = last7Days.map(date =>
          classes.filter(c =>
            c.created_at && new Date(c.created_at).toDateString() === date.toDateString()
          ).length + (date < new Date() ? summaryData.total : 0)
        );

        setClassData({
          ...summaryData,
          trend,
          growthPercent,
        });
      } catch (error) {
        console.error('Error fetching classes:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchClasses();
  }, []);





  if (loading) {
    return null; // or a loading spinner
  }

  return (
    <AnalyticsWidgetSummary
      title="Number of Classes"
      percent={classData.growthPercent}
      total={classData.total}
      icon={<img alt="Total Classes" src="/assets/icons/glass/ic-glass-users.svg" />}
      chart={{
        categories: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
        series: classData.trend,
      }}
    />
  );
}

type StaffData = {
  total: number;
  active: number;
  inactive: number;
  currentYear: number;
  trend: number[];
  growthPercent: number;
  male: number;
  female: number;
  otherGender: number;
};

function StaffWidget() {
  const [loading, setLoading] = useState(true);
  const [staffData, setStaffData] = useState<StaffData>({
    total: 0,
    active: 0,
    inactive: 0,
    currentYear: 0,
    trend: [],
    growthPercent: 0,
    male: 0,
    female: 0,
    otherGender: 0,
  });

  useEffect(() => {
    const fetchStaff = async () => {
      try {
        const staff = await invoke<any[]>('get_all_staffs');
        const currentYear = '2024-2025';

        const summaryData = staff.reduce(
          (acc, staffMember) => ({
            total: acc.total + 1,
            active: acc.active + (staffMember.status === 'active' ? 1 : 0),
            inactive: acc.inactive + (staffMember.status !== 'active' ? 1 : 0),
            currentYear: acc.currentYear + (staffMember.joining_date?.includes(currentYear) ? 1 : 0),
            male: acc.male + (staffMember.gender === 'male' ? 1 : 0),
            female: acc.female + (staffMember.gender === 'female' ? 1 : 0),
            otherGender: acc.otherGender + (!['male', 'female'].includes(staffMember.gender) ? 1 : 0),
          }),
          {
            total: 0,
            active: 0,
            inactive: 0,
            currentYear: 0,
            male: 0,
            female: 0,
            otherGender: 0
          }
        );

        const previousTotal = staff.filter(s =>
          s.created_at && new Date(s.created_at).getMonth() < new Date().getMonth()
        ).length;
        const growthPercent = previousTotal ? ((summaryData.total - previousTotal) / previousTotal) * 100 : 0;

        const last7Days = Array.from({ length: 7 }, (_, i) => {
          const date = new Date();
          date.setDate(date.getDate() - i);
          return date;
        }).reverse();

        const trend = last7Days.map(date =>
          staff.filter(s =>
            s.created_at && new Date(s.created_at).toDateString() === date.toDateString()
          ).length + (date < new Date() ? summaryData.total : 0)
        );

        setStaffData({
          ...summaryData,
          trend,
          growthPercent,
        });
      } catch (error) {
        console.error('Error fetching staff:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStaff();
  }, []);

  if (loading) {
    return null;
  }

  return (
    <AnalyticsWidgetSummary
      title="Number of Staff"
      percent={staffData.growthPercent}
      total={staffData.total}
      color="info"
      icon={<img alt="Total Staff" src="/assets/icons/glass/ic-glass-users.svg" />}
      chart={{
        categories: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
        series: staffData.trend,
      }}
    />
  );
}
type EnquiryData = {
  total: number;
  new: number;
  inProgress: number;
  completed: number;
  cancelled: number;
  trend: number[];
  growthPercent: number;
};

function EnquiriesWidget() {
  const [loading, setLoading] = useState(true);
  const [enquiryData, setEnquiryData] = useState<EnquiryData>({
    total: 0,
    new: 0,
    inProgress: 0,
    completed: 0,
    cancelled: 0,
    trend: [],
    growthPercent: 0,
  });

  useEffect(() => {
    const fetchEnquiries = async () => {
      try {
        const enquiries = await invoke<any[]>('get_all_enquiries');

        const summaryData = enquiries.reduce(
          (acc, enquiry) => ({
            total: acc.total + 1,
            new: acc.new + (enquiry.status === 'new' ? 1 : 0),
            inProgress: acc.inProgress + (enquiry.status === 'in progress' ? 1 : 0),
            completed: acc.completed + (enquiry.status === 'completed' ? 1 : 0),
            cancelled: acc.cancelled + (enquiry.status === 'cancelled' ? 1 : 0),
          }),
          {
            total: 0,
            new: 0,
            inProgress: 0,
            completed: 0,
            cancelled: 0
          }
        );

        const previousTotal = enquiries.filter(e =>
          e.created_at && new Date(e.created_at).getMonth() < new Date().getMonth()
        ).length;
        const growthPercent = previousTotal ? ((summaryData.total - previousTotal) / previousTotal) * 100 : 0;

        const last7Days = Array.from({ length: 7 }, (_, i) => {
          const date = new Date();
          date.setDate(date.getDate() - i);
          return date;
        }).reverse();

        const trend = last7Days.map(date =>
          enquiries.filter(e =>
            e.created_at && new Date(e.created_at).toDateString() === date.toDateString()
          ).length + (date < new Date() ? summaryData.total : 0)
        );

        setEnquiryData({
          ...summaryData,
          trend,
          growthPercent,
        });
      } catch (error) {
        console.error('Error fetching enquiries:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchEnquiries();
  }, []);

  if (loading) {
    return null;
  }

  return (
    <AnalyticsWidgetSummary
      title="Number of Enquiries"
      percent={enquiryData.growthPercent}
      total={enquiryData.total}
      color="warning"
      icon={<img alt="Total Enquiries" src="/assets/icons/glass/ic-glass-message.svg" />}
      chart={{
        categories: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
        series: enquiryData.trend,
      }}
    />
  );
}

export default function () {

  const [schoolData, setSchoolData] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const fetchSchoolData = async () => {
      const schoolId = localStorage.getItem('school_id');
      if (!schoolId) {
        setError('No school ID found in localStorage.');
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(`${Config.backend}/schools/${schoolId}`);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();


        setSchoolData(data);
      } catch (err) {
        if (err instanceof Error) {
          setError(err.message);
        } else {
          setError(String(err)); // fallback for unknown error types
        }
      }
      finally {
        setLoading(false);
      }
    };

    fetchSchoolData();
  }, []);
  return (
    <DashboardContent maxWidth="xl">
      <Typography variant="h4" sx={{ mb: { xs: 3, md: 5 } }}>
        Hi, Welcome back 👋
      </Typography>
      <Grid container spacing={3}>
        <Grid size={{ xs: 12, sm: 12, md: 12 }}>
          <SchoolBanner
            color="primary"
            logo="/assets/images/schoollogo/ShaheenSchool.png"
            sx={{ mb: 3 }}
            school={schoolData}
          />
        </Grid>


        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StudentsWidget />
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <ClassesWidget />
        </Grid>




        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StaffWidget />
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <EnquiriesWidget />
        </Grid>

        <Grid size={{ xs: 12, md: 12 }}>
          <AnalyticsClassSummary />
        </Grid>
        {/* <Grid size={{ xs: 12, md: 6, lg: 4 }}>
          <AnalyticsCurrentVisits
            title="Current visits"
            chart={{
              series: [
                { label: 'America', value: 3500 },
                { label: 'Asia', value: 2500 },
                { label: 'Europe', value: 1500 },
                { label: 'Africa', value: 500 },
              ],
            }}
          />
        </Grid> */}

        {/* <Grid size={{ xs: 12, md: 6, lg: 8 }}>
          <AnalyticsWebsiteVisits
            title="Website visits"
            subheader="(+43%) than last year"
            chart={{
              categories: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep'],
              series: [
                { name: 'Team A', data: [43, 33, 22, 37, 67, 68, 37, 24, 55] },
                { name: 'Team B', data: [51, 70, 47, 67, 40, 37, 24, 70, 24] },
              ],
            }}
          />
        </Grid> */}

        {/* <Grid size={{ xs: 12, md: 6, lg: 8 }}>
          <AnalyticsConversionRates
            title="Class Status Overview"
            subheader="Current Academic Year"
            chart={{
              categories: ['Active', 'Inactive', 'On Break', 'Upcoming', 'Completed'],
              series: [
                { name: 'Current Term', data: [25, 5, 2, 3, 0] },
                { name: 'Previous Term', data: [20, 3, 4, 8, 15] },
              ],
            }}
          />
        </Grid> */}

        {/* <Grid size={{ xs: 12, md: 6, lg: 4 }}>
          <AnalyticsCurrentSubject
            title="Current subject"
            chart={{
              categories: ['English', 'History', 'Physics', 'Geography', 'Chinese', 'Math'],
              series: [
                { name: 'Series 1', data: [80, 50, 30, 40, 100, 20] },
                { name: 'Series 2', data: [20, 30, 40, 80, 20, 80] },
                { name: 'Series 3', data: [44, 76, 78, 13, 43, 10] },
              ],
            }}
          />
        </Grid> */}
        {/* 
        <Grid size={{ xs: 12, md: 6, lg: 8 }}>
          <AnalyticsNews title="News" list={_posts.slice(0, 5)} />
        </Grid>

        <Grid size={{ xs: 12, md: 6, lg: 4 }}>
          <AnalyticsOrderTimeline title="Order timeline" list={_timeline} />
        </Grid> */}

        {/* <Grid size={{ xs: 12, md: 6, lg: 4 }}>
          <AnalyticsTrafficBySite title="Traffic by site" list={_traffic} />
        </Grid> */}

        {/* <Grid size={{ xs: 12, md: 6, lg: 8 }}>
          <AnalyticsTasks title="Tasks" list={_tasks} />
        </Grid> */}

      </Grid>
    </DashboardContent>
  );
}
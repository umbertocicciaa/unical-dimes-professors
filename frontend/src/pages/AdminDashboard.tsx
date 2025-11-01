import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AuthenticatedUser,
  Course,
  Review,
  Role,
  Teacher,
  adminApi,
  apiClient,
  UpdateCourse,
  UpdateReview,
  UpdateTeacher,
  UserAdminUpdate,
} from '../api/client';
import { useAuth } from '../context/AuthContext';
import './AdminDashboard.css';

type AdminTab = 'teachers' | 'courses' | 'reviews' | 'users';

type UserEditState = Record<number, { roleNames: string[]; isActive: boolean }>;

const defaultTeacherForm = { name: '', department: '' };
const defaultCourseForm = { name: '', teacher_id: '' as string | number };

const AdminDashboard: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<AdminTab>('teachers');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [users, setUsers] = useState<AuthenticatedUser[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);

  const [newTeacher, setNewTeacher] = useState(defaultTeacherForm);
  const [editingTeacherId, setEditingTeacherId] = useState<number | null>(null);
  const [editingTeacher, setEditingTeacher] = useState(defaultTeacherForm);

  const [newCourse, setNewCourse] = useState(defaultCourseForm);
  const [editingCourseId, setEditingCourseId] = useState<number | null>(null);
  const [editingCourse, setEditingCourse] = useState(defaultCourseForm);

  const [editingReviewId, setEditingReviewId] = useState<number | null>(null);
  const [editingReview, setEditingReview] = useState<{ rating: number; description: string }>({
    rating: 5,
    description: '',
  });

  const [userEdits, setUserEdits] = useState<UserEditState>({});

  const resetStatus = useCallback(() => {
    setStatusMessage(null);
    setErrorMessage(null);
  }, []);

  const captureError = useCallback((err: any, fallbackMessage: string) => {
    const detail =
      err?.response?.data?.detail ||
      (Array.isArray(err?.response?.data) ? err.response.data[0]?.msg : null) ||
      err?.message ||
      fallbackMessage;
    console.error(fallbackMessage, err);
    setErrorMessage(detail);
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    resetStatus();
    try {
      const [teacherRes, courseRes, reviewRes, roleRes, userRes] = await Promise.all([
        apiClient.getTeachers(),
        apiClient.getCourses(),
        apiClient.getReviews(),
        adminApi.getRoles(),
        adminApi.getUsers(true),
      ]);
      setTeachers(teacherRes.data);
      setCourses(courseRes.data);
      setReviews(reviewRes.data);
      setRoles(roleRes.data);
      setUsers(userRes.data);
      setStatusMessage('Dashboard data refreshed.');
    } catch (err) {
      captureError(err, 'Failed to load admin data');
    } finally {
      setLoading(false);
    }
  }, [captureError, resetStatus]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    const initialEdits: UserEditState = {};
    users.forEach((u) => {
      initialEdits[u.id] = {
        roleNames: u.roles.map((role) => role.name),
        isActive: u.is_active,
      };
    });
    setUserEdits(initialEdits);
  }, [users]);

  const sortedRoles = useMemo(() => roles.map((role) => role.name).sort(), [roles]);

  const handleCreateTeacher = async (event: React.FormEvent) => {
    event.preventDefault();
    resetStatus();
    try {
      const payload = { name: newTeacher.name.trim(), department: newTeacher.department.trim() || undefined };
      const { data } = await apiClient.createTeacher(payload);
      setTeachers((prev) => [...prev, data]);
      setNewTeacher(defaultTeacherForm);
      setStatusMessage('Teacher created successfully.');
    } catch (err) {
      captureError(err, 'Unable to create teacher');
    }
  };

  const beginEditTeacher = (teacher: Teacher) => {
    setEditingTeacherId(teacher.id);
    setEditingTeacher({ name: teacher.name, department: teacher.department ?? '' });
  };

  const handleUpdateTeacher = async (event: React.FormEvent) => {
    event.preventDefault();
    if (editingTeacherId === null) {
      return;
    }
    resetStatus();
    try {
      const payload: UpdateTeacher = {
        name: editingTeacher.name.trim() || undefined,
        department: editingTeacher.department.trim() || undefined,
      };
      const { data } = await apiClient.updateTeacher(editingTeacherId, payload);
      setTeachers((prev) => prev.map((t) => (t.id === data.id ? data : t)));
      setEditingTeacherId(null);
      setEditingTeacher(defaultTeacherForm);
      setStatusMessage('Teacher updated successfully.');
    } catch (err) {
      captureError(err, 'Unable to update teacher');
    }
  };

  const handleDeleteTeacher = async (id: number) => {
    resetStatus();
    if (!window.confirm('Delete this teacher? This will cascade to related courses and reviews.')) {
      return;
    }
    try {
      await apiClient.deleteTeacher(id);
      setTeachers((prev) => prev.filter((t) => t.id !== id));
      setStatusMessage('Teacher deleted.');
    } catch (err) {
      captureError(err, 'Unable to delete teacher');
    }
  };

  const handleCreateCourse = async (event: React.FormEvent) => {
    event.preventDefault();
    resetStatus();
    const teacherId = Number(newCourse.teacher_id);
    if (!teacherId) {
      setErrorMessage('Select a teacher for the course.');
      return;
    }
    try {
      const payload = { name: newCourse.name.trim(), teacher_id: teacherId };
      const { data } = await apiClient.createCourse(payload);
      setCourses((prev) => [...prev, data]);
      setNewCourse(defaultCourseForm);
      setStatusMessage('Course created successfully.');
    } catch (err) {
      captureError(err, 'Unable to create course');
    }
  };

  const beginEditCourse = (course: Course) => {
    setEditingCourseId(course.id);
    setEditingCourse({ name: course.name, teacher_id: String(course.teacher_id) });
  };

  const handleUpdateCourse = async (event: React.FormEvent) => {
    event.preventDefault();
    if (editingCourseId === null) {
      return;
    }
    resetStatus();
    const teacherId = editingCourse.teacher_id ? Number(editingCourse.teacher_id) : undefined;
    try {
      const payload: UpdateCourse = {
        name: editingCourse.name.trim() || undefined,
        teacher_id: teacherId,
      };
      const { data } = await apiClient.updateCourse(editingCourseId, payload);
      setCourses((prev) => prev.map((c) => (c.id === data.id ? data : c)));
      setEditingCourseId(null);
      setEditingCourse(defaultCourseForm);
      setStatusMessage('Course updated successfully.');
    } catch (err) {
      captureError(err, 'Unable to update course');
    }
  };

  const handleDeleteCourse = async (id: number) => {
    resetStatus();
    if (!window.confirm('Delete this course? Related reviews will be removed.')) {
      return;
    }
    try {
      await apiClient.deleteCourse(id);
      setCourses((prev) => prev.filter((c) => c.id !== id));
      setStatusMessage('Course deleted.');
    } catch (err) {
      captureError(err, 'Unable to delete course');
    }
  };

  const beginEditReview = (review: Review) => {
    setEditingReviewId(review.id);
    setEditingReview({ rating: review.rating, description: review.description });
  };

  const handleUpdateReview = async (event: React.FormEvent) => {
    event.preventDefault();
    if (editingReviewId === null) {
      return;
    }
    resetStatus();
    try {
      const payload: UpdateReview = {
        rating: editingReview.rating,
        description: editingReview.description.trim() || undefined,
      };
      const { data } = await apiClient.updateReview(editingReviewId, payload);
      setReviews((prev) => prev.map((r) => (r.id === data.id ? data : r)));
      setEditingReviewId(null);
      setStatusMessage('Review updated.');
    } catch (err) {
      captureError(err, 'Unable to update review');
    }
  };

  const handleDeleteReview = async (id: number) => {
    resetStatus();
    if (!window.confirm('Delete this review?')) {
      return;
    }
    try {
      await apiClient.deleteReview(id);
      setReviews((prev) => prev.filter((r) => r.id !== id));
      setStatusMessage('Review deleted.');
    } catch (err) {
      captureError(err, 'Unable to delete review');
    }
  };

  const handleUserRoleToggle = (userId: number, roleName: string) => {
    setUserEdits((prev) => {
      const current = prev[userId] ?? { roleNames: [], isActive: true };
      const hasRole = current.roleNames.includes(roleName);
      const updatedRoles = hasRole
        ? current.roleNames.filter((name) => name !== roleName)
        : [...current.roleNames, roleName];
      return { ...prev, [userId]: { ...current, roleNames: updatedRoles } };
    });
  };

  const handleUserActiveToggle = (userId: number) => {
    setUserEdits((prev) => {
      const current = prev[userId] ?? { roleNames: [], isActive: true };
      return { ...prev, [userId]: { ...current, isActive: !current.isActive } };
    });
  };

  const handleSaveUser = async (userId: number) => {
    resetStatus();
    const edits = userEdits[userId];
    if (!edits) {
      return;
    }
    try {
      const payload: UserAdminUpdate = {
        role_names: edits.roleNames,
        is_active: edits.isActive,
      };
      const { data } = await adminApi.updateUser(userId, payload);
      setUsers((prev) => prev.map((u) => (u.id === data.id ? data : u)));
      setStatusMessage('User updated.');
    } catch (err) {
      captureError(err, 'Unable to update user');
    }
  };

  const tabButtons = useMemo(
    () => [
      { key: 'teachers', label: 'Teachers' },
      { key: 'courses', label: 'Courses' },
      { key: 'reviews', label: 'Reviews' },
      { key: 'users', label: 'Users & Roles' },
    ],
    [],
  );

  const renderTeacherTab = () => (
    <section className="admin-panel">
      <div className="panel-header">
        <h2>Manage Teachers</h2>
        <button type="button" onClick={loadData} className="outline-btn">
          Refresh
        </button>
      </div>

      <form className="inline-form" onSubmit={handleCreateTeacher}>
        <div>
          <label htmlFor="new-teacher-name">Name</label>
          <input
            id="new-teacher-name"
            value={newTeacher.name}
            onChange={(event) => setNewTeacher((prev) => ({ ...prev, name: event.target.value }))}
            required
          />
        </div>
        <div>
          <label htmlFor="new-teacher-dept">Department</label>
          <input
            id="new-teacher-dept"
            value={newTeacher.department}
            onChange={(event) => setNewTeacher((prev) => ({ ...prev, department: event.target.value }))}
          />
        </div>
        <button type="submit" className="primary-btn">
          Add Teacher
        </button>
      </form>

      <div className="admin-table">
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Name</th>
              <th>Department</th>
              <th>Average Rating</th>
              <th>Reviews</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {teachers.map((teacher) =>
              editingTeacherId === teacher.id ? (
                <tr key={teacher.id}>
                  <td>{teacher.id}</td>
                  <td>
                    <input
                      value={editingTeacher.name}
                      onChange={(event) => setEditingTeacher((prev) => ({ ...prev, name: event.target.value }))}
                      required
                    />
                  </td>
                  <td>
                    <input
                      value={editingTeacher.department}
                      onChange={(event) => setEditingTeacher((prev) => ({ ...prev, department: event.target.value }))}
                    />
                  </td>
                  <td>{teacher.average_rating ? teacher.average_rating.toFixed(2) : '—'}</td>
                  <td>{teacher.review_count}</td>
                  <td className="actions-cell">
                    <button type="button" className="primary-btn" onClick={handleUpdateTeacher}>
                      Save
                    </button>
                    <button
                      type="button"
                      className="outline-btn"
                      onClick={() => {
                        setEditingTeacherId(null);
                        setEditingTeacher(defaultTeacherForm);
                      }}
                    >
                      Cancel
                    </button>
                  </td>
                </tr>
              ) : (
                <tr key={teacher.id}>
                  <td>{teacher.id}</td>
                  <td>{teacher.name}</td>
                  <td>{teacher.department || '—'}</td>
                  <td>{teacher.average_rating ? teacher.average_rating.toFixed(2) : '—'}</td>
                  <td>{teacher.review_count}</td>
                  <td className="actions-cell">
                    <button type="button" className="outline-btn" onClick={() => beginEditTeacher(teacher)}>
                      Edit
                    </button>
                    <button type="button" className="danger-btn" onClick={() => handleDeleteTeacher(teacher.id)}>
                      Delete
                    </button>
                  </td>
                </tr>
              ),
            )}
          </tbody>
        </table>
      </div>
    </section>
  );

  const renderCourseTab = () => (
    <section className="admin-panel">
      <div className="panel-header">
        <h2>Manage Courses</h2>
        <button type="button" onClick={loadData} className="outline-btn">
          Refresh
        </button>
      </div>

      <form className="inline-form" onSubmit={handleCreateCourse}>
        <div>
          <label htmlFor="new-course-name">Name</label>
          <input
            id="new-course-name"
            value={newCourse.name}
            onChange={(event) => setNewCourse((prev) => ({ ...prev, name: event.target.value }))}
            required
          />
        </div>
        <div>
          <label htmlFor="new-course-teacher">Teacher</label>
          <select
            id="new-course-teacher"
            value={newCourse.teacher_id}
            onChange={(event) => setNewCourse((prev) => ({ ...prev, teacher_id: event.target.value }))}
            required
          >
            <option value="">Select teacher</option>
            {teachers.map((teacher) => (
              <option key={teacher.id} value={teacher.id}>
                {teacher.name}
              </option>
            ))}
          </select>
        </div>
        <button type="submit" className="primary-btn">
          Add Course
        </button>
      </form>

      <div className="admin-table">
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Name</th>
              <th>Teacher</th>
              <th>Created</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {courses.map((course) =>
              editingCourseId === course.id ? (
                <tr key={course.id}>
                  <td>{course.id}</td>
                  <td>
                    <input
                      value={editingCourse.name}
                      onChange={(event) => setEditingCourse((prev) => ({ ...prev, name: event.target.value }))}
                      required
                    />
                  </td>
                  <td>
                    <select
                      value={editingCourse.teacher_id}
                      onChange={(event) => setEditingCourse((prev) => ({ ...prev, teacher_id: event.target.value }))}
                      required
                    >
                      <option value="">Select teacher</option>
                      {teachers.map((teacher) => (
                        <option key={teacher.id} value={teacher.id}>
                          {teacher.name}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>{new Date(course.created_at).toLocaleDateString()}</td>
                  <td className="actions-cell">
                    <button type="button" className="primary-btn" onClick={handleUpdateCourse}>
                      Save
                    </button>
                    <button
                      type="button"
                      className="outline-btn"
                      onClick={() => {
                        setEditingCourseId(null);
                        setEditingCourse(defaultCourseForm);
                      }}
                    >
                      Cancel
                    </button>
                  </td>
                </tr>
              ) : (
                <tr key={course.id}>
                  <td>{course.id}</td>
                  <td>{course.name}</td>
                  <td>{teachers.find((teacher) => teacher.id === course.teacher_id)?.name || '—'}</td>
                  <td>{new Date(course.created_at).toLocaleDateString()}</td>
                  <td className="actions-cell">
                    <button type="button" className="outline-btn" onClick={() => beginEditCourse(course)}>
                      Edit
                    </button>
                    <button type="button" className="danger-btn" onClick={() => handleDeleteCourse(course.id)}>
                      Delete
                    </button>
                  </td>
                </tr>
              ),
            )}
          </tbody>
        </table>
      </div>
    </section>
  );

  const renderReviewTab = () => (
    <section className="admin-panel">
      <div className="panel-header">
        <h2>Manage Reviews</h2>
        <button type="button" onClick={loadData} className="outline-btn">
          Refresh
        </button>
      </div>

      <div className="admin-table">
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Teacher</th>
              <th>Course</th>
              <th>Rating</th>
              <th>Description</th>
              <th>Created</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {reviews.map((review) =>
              editingReviewId === review.id ? (
                <tr key={review.id}>
                  <td>{review.id}</td>
                  <td>{teachers.find((teacher) => teacher.id === review.teacher_id)?.name || review.teacher_id}</td>
                  <td>{courses.find((course) => course.id === review.course_id)?.name || review.course_id}</td>
                  <td>
                    <input
                      type="number"
                      min={1}
                      max={5}
                      value={editingReview.rating}
                      onChange={(event) =>
                        setEditingReview((prev) => ({ ...prev, rating: Number(event.target.value) }))
                      }
                      required
                    />
                  </td>
                  <td>
                    <textarea
                      value={editingReview.description}
                      onChange={(event) =>
                        setEditingReview((prev) => ({ ...prev, description: event.target.value }))
                      }
                      rows={3}
                      required
                    />
                  </td>
                  <td>{new Date(review.created_at).toLocaleString()}</td>
                  <td className="actions-cell">
                    <button type="button" className="primary-btn" onClick={handleUpdateReview}>
                      Save
                    </button>
                    <button
                      type="button"
                      className="outline-btn"
                      onClick={() => {
                        setEditingReviewId(null);
                        setEditingReview({ rating: 5, description: '' });
                      }}
                    >
                      Cancel
                    </button>
                  </td>
                </tr>
              ) : (
                <tr key={review.id}>
                  <td>{review.id}</td>
                  <td>{teachers.find((teacher) => teacher.id === review.teacher_id)?.name || review.teacher_id}</td>
                  <td>{courses.find((course) => course.id === review.course_id)?.name || review.course_id}</td>
                  <td>{review.rating}</td>
                  <td className="review-text">{review.description}</td>
                  <td>{new Date(review.created_at).toLocaleString()}</td>
                  <td className="actions-cell">
                    <button type="button" className="outline-btn" onClick={() => beginEditReview(review)}>
                      Edit
                    </button>
                    <button type="button" className="danger-btn" onClick={() => handleDeleteReview(review.id)}>
                      Delete
                    </button>
                  </td>
                </tr>
              ),
            )}
          </tbody>
        </table>
      </div>
    </section>
  );

  const renderUserTab = () => (
    <section className="admin-panel">
      <div className="panel-header">
        <h2>Manage Users & Roles</h2>
        <button type="button" onClick={loadData} className="outline-btn">
          Refresh
        </button>
      </div>

      <div className="admin-table">
        <table>
          <thead>
            <tr>
              <th>Email</th>
              <th>Roles</th>
              <th>Status</th>
              <th>Created</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((item) => {
              const editState = userEdits[item.id] ?? { roleNames: [], isActive: item.is_active };
              const roleSummary = item.roles.map((role) => role.name).join(', ') || '—';
              return (
                <tr key={item.id}>
                  <td>{item.email}</td>
                  <td>
                    <div className="role-checkbox-group">
                      {sortedRoles.map((role) => (
                        <label key={role} className="role-checkbox">
                          <input
                            type="checkbox"
                            checked={editState.roleNames.includes(role)}
                            onChange={() => handleUserRoleToggle(item.id, role)}
                          />
                          {role}
                        </label>
                      ))}
                    </div>
                    <div className="role-summary">Current: {roleSummary}</div>
                  </td>
                  <td>
                    <label className="toggle">
                      <input
                        type="checkbox"
                        checked={editState.isActive}
                        onChange={() => handleUserActiveToggle(item.id)}
                      />
                      <span>{editState.isActive ? 'Active' : 'Disabled'}</span>
                    </label>
                  </td>
                  <td>{new Date(item.created_at).toLocaleDateString()}</td>
                  <td className="actions-cell">
                    <button type="button" className="primary-btn" onClick={() => handleSaveUser(item.id)}>
                      Save
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );

  return (
    <div className="admin-dashboard">
      <header className="admin-header">
        <div>
          <h1>Admin Control Center</h1>
          <p>Signed in as {user?.email}</p>
        </div>
      </header>

      <div className="admin-tabs">
        {tabButtons.map((tab) => (
          <button
            key={tab.key}
            type="button"
            className={activeTab === tab.key ? 'tab active' : 'tab'}
            onClick={() => setActiveTab(tab.key as AdminTab)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {statusMessage && <div className="admin-alert success">{statusMessage}</div>}
      {errorMessage && <div className="admin-alert error">{errorMessage}</div>}
      {loading ? (
        <div className="full-screen-message">Loading admin data…</div>
      ) : (
        <>
          {activeTab === 'teachers' && renderTeacherTab()}
          {activeTab === 'courses' && renderCourseTab()}
          {activeTab === 'reviews' && renderReviewTab()}
          {activeTab === 'users' && renderUserTab()}
        </>
      )}
    </div>
  );
};

export default AdminDashboard;

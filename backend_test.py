import requests
import sys
import json
from datetime import datetime, timedelta

class MentraAPITester:
    def __init__(self, base_url="https://mentra-social.preview.emergentagent.com/api"):
        self.base_url = base_url
        self.token = None
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []
        self.user_id = None
        self.student_id = None
        self.lesson_id = None
        self.payment_id = None

    def log_test(self, name, success, details=""):
        """Log test result"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {name} - PASSED")
        else:
            print(f"❌ {name} - FAILED: {details}")
        
        self.test_results.append({
            "test": name,
            "success": success,
            "details": details
        })

    def run_test(self, name, method, endpoint, expected_status, data=None, files=None):
        """Run a single API test"""
        url = f"{self.base_url}/{endpoint}"
        headers = {'Content-Type': 'application/json'}
        if self.token:
            headers['Authorization'] = f'Bearer {self.token}'

        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers)
            elif method == 'POST':
                if files:
                    # Remove Content-Type for file uploads
                    headers.pop('Content-Type', None)
                    response = requests.post(url, files=files, headers=headers)
                else:
                    response = requests.post(url, json=data, headers=headers)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers)

            success = response.status_code == expected_status
            
            if success:
                self.log_test(name, True)
                try:
                    return response.json() if response.content else {}
                except:
                    return {}
            else:
                error_msg = f"Expected {expected_status}, got {response.status_code}"
                try:
                    error_detail = response.json()
                    error_msg += f" - {error_detail}"
                except:
                    error_msg += f" - {response.text[:200]}"
                self.log_test(name, False, error_msg)
                return {}

        except Exception as e:
            self.log_test(name, False, f"Exception: {str(e)}")
            return {}

    def test_auth_flow(self):
        """Test authentication endpoints"""
        print("\n" + "="*50)
        print("TESTING AUTHENTICATION")
        print("="*50)
        
        # Test registration with new user
        timestamp = datetime.now().strftime('%H%M%S')
        test_email = f"test_user_{timestamp}@test.com"
        test_password = "TestPass123!"
        
        register_data = {
            "email": test_email,
            "password": test_password,
            "full_name": "Test User",
            "age": 30,
            "subject": "Matematik"
        }
        
        response = self.run_test(
            "User Registration",
            "POST",
            "auth/register",
            200,
            data=register_data
        )
        
        if response and 'token' in response:
            self.token = response['token']
            self.user_id = response['user']['id']
            print(f"   ✓ Token received: {self.token[:20]}...")
        
        # Test login with existing user
        login_data = {
            "email": "teacher1@test.com",
            "password": "test123"
        }
        
        response = self.run_test(
            "User Login",
            "POST", 
            "auth/login",
            200,
            data=login_data
        )
        
        if response and 'token' in response:
            self.token = response['token']
            self.user_id = response['user']['id']
            print(f"   ✓ Login successful, using existing user token")
        
        # Test get current user
        self.run_test(
            "Get Current User",
            "GET",
            "auth/me",
            200
        )

    def test_dashboard(self):
        """Test dashboard endpoint"""
        print("\n" + "="*50)
        print("TESTING DASHBOARD")
        print("="*50)
        
        response = self.run_test(
            "Get Dashboard Stats",
            "GET",
            "teacher/dashboard",
            200
        )
        
        if response:
            required_fields = ['students_count', 'weekly_lessons', 'pending_payments', 'today_lessons']
            for field in required_fields:
                if field in response:
                    print(f"   ✓ {field}: {response[field]}")
                else:
                    self.log_test(f"Dashboard field {field}", False, "Missing field")

    def test_student_crud(self):
        """Test student CRUD operations"""
        print("\n" + "="*50)
        print("TESTING STUDENT MANAGEMENT")
        print("="*50)
        
        # Create student
        student_data = {
            "full_name": "Test Öğrenci",
            "grade": "9. Sınıf",
            "hourly_rate": 150.0,
            "last_topic": "Fonksiyonlar",
            "guardian_name": "Test Veli",
            "guardian_email": "veli@test.com",
            "guardian_phone": "05551234567"
        }
        
        response = self.run_test(
            "Create Student",
            "POST",
            "students",
            200,
            data=student_data
        )
        
        if response and 'id' in response:
            self.student_id = response['id']
            print(f"   ✓ Student created with ID: {self.student_id}")
        
        # Get all students
        response = self.run_test(
            "Get All Students",
            "GET",
            "students",
            200
        )
        
        if response and isinstance(response, list):
            print(f"   ✓ Found {len(response)} students")
        
        # Get specific student
        if self.student_id:
            self.run_test(
                "Get Student by ID",
                "GET",
                f"students/{self.student_id}",
                200
            )
            
            # Update student
            updated_data = {
                **student_data,
                "grade": "10. Sınıf"
            }
            
            self.run_test(
                "Update Student",
                "PUT",
                f"students/{self.student_id}",
                200,
                data=updated_data
            )

    def test_lesson_management(self):
        """Test lesson management"""
        print("\n" + "="*50)
        print("TESTING LESSON MANAGEMENT")
        print("="*50)
        
        if not self.student_id:
            self.log_test("Lesson Management", False, "No student ID available")
            return
        
        # Create lesson
        lesson_data = {
            "student_id": self.student_id,
            "day_of_week": 1,  # Tuesday
            "start_time": "14:00",
            "end_time": "15:00",
            "topic": "Matematik - Fonksiyonlar",
            "status": "scheduled"
        }
        
        response = self.run_test(
            "Create Lesson",
            "POST",
            "lessons",
            200,
            data=lesson_data
        )
        
        if response and 'id' in response:
            self.lesson_id = response['id']
            print(f"   ✓ Lesson created with ID: {self.lesson_id}")
        
        # Get all lessons
        self.run_test(
            "Get All Lessons",
            "GET",
            "lessons",
            200
        )
        
        # Get lessons for specific student
        self.run_test(
            "Get Student Lessons",
            "GET",
            f"lessons?student_id={self.student_id}",
            200
        )

    def test_lesson_completion_with_debt(self):
        """Test lesson completion with automatic debt creation"""
        print("\n" + "="*50)
        print("TESTING LESSON COMPLETION WITH DEBT TRACKING")
        print("="*50)
        
        if not self.lesson_id:
            self.log_test("Lesson Completion with Debt", False, "No lesson ID available")
            return
        
        # Complete lesson with details (should auto-create payment)
        completion_data = {
            "topic": "Fonksiyonlar ve Grafikler",
            "weaknesses": "Grafik çiziminde zorlanıyor",
            "homework": "Sayfa 45-50 problemleri",
            "note": "Öğrenci aktif katılım gösterdi"
        }
        
        try:
            url = f"{self.base_url}/lessons/{self.lesson_id}/complete-with-details"
            headers = {'Authorization': f'Bearer {self.token}'}
            response = requests.post(url, headers=headers, params=completion_data)
            
            if response.status_code == 200:
                self.log_test("Complete Lesson with Details", True)
                result = response.json()
                print(f"   ✓ Lesson completed, session ID: {result.get('session_id', 'N/A')}")
                
                # Verify payment was created automatically
                payments_response = self.run_test(
                    "Verify Auto-Created Payment",
                    "GET",
                    f"payments?student_id={self.student_id}",
                    200
                )
                
                if payments_response and isinstance(payments_response, list):
                    pending_payments = [p for p in payments_response if p['status'] == 'Beklemede']
                    if pending_payments:
                        print(f"   ✓ Auto-created payment found: {pending_payments[-1]['amount']} TL")
                    else:
                        self.log_test("Auto Payment Creation", False, "No pending payment found")
                
            else:
                error_msg = f"Status: {response.status_code}"
                try:
                    error_detail = response.json()
                    error_msg += f" - {error_detail}"
                except:
                    error_msg += f" - {response.text[:200]}"
                self.log_test("Complete Lesson with Details", False, error_msg)
        except Exception as e:
            self.log_test("Complete Lesson with Details", False, str(e))

    def test_payment_management(self):
        """Test payment management"""
        print("\n" + "="*50)
        print("TESTING PAYMENT MANAGEMENT")
        print("="*50)
        
        if not self.student_id:
            self.log_test("Payment Management", False, "No student ID available")
            return
        
        # Create payment
        payment_data = {
            "student_id": self.student_id,
            "amount": 300.0,
            "date": datetime.now().strftime('%Y-%m-%d'),
            "status": "Ödendi"
        }
        
        response = self.run_test(
            "Create Payment",
            "POST",
            "payments",
            200,
            data=payment_data
        )
        
        if response and 'id' in response:
            self.payment_id = response['id']
            print(f"   ✓ Payment created with ID: {self.payment_id}")
        
        # Get all payments
        self.run_test(
            "Get All Payments",
            "GET",
            "payments",
            200
        )
        
        # Get payments for specific student
        self.run_test(
            "Get Student Payments",
            "GET",
            f"payments?student_id={self.student_id}",
            200
        )

    def test_session_management(self):
        """Test session management"""
        print("\n" + "="*50)
        print("TESTING SESSION MANAGEMENT")
        print("="*50)
        
        if not self.student_id or not self.lesson_id:
            self.log_test("Session Management", False, "Missing student or lesson ID")
            return
        
        # Create session
        session_data = {
            "lesson_id": self.lesson_id,
            "student_id": self.student_id,
            "date": datetime.now().strftime('%Y-%m-%d'),
            "start_time": "14:00",
            "end_time": "15:00",
            "topic": "Fonksiyonlar",
            "note": "Öğrenci konuyu iyi anladı",
            "evaluation": "Başarılı",
            "status": "completed"
        }
        
        response = self.run_test(
            "Create Session",
            "POST",
            "sessions",
            200,
            data=session_data
        )
        
        # Get all sessions
        self.run_test(
            "Get All Sessions",
            "GET",
            "sessions",
            200
        )

    def test_reports(self):
        """Test report generation"""
        print("\n" + "="*50)
        print("TESTING REPORTS")
        print("="*50)
        
        if not self.student_id:
            self.log_test("Report Generation", False, "No student ID available")
            return
        
        # Test PDF report generation
        start_date = (datetime.now() - timedelta(days=30)).strftime('%Y-%m-%d')
        end_date = datetime.now().strftime('%Y-%m-%d')
        
        # Note: This will return binary data, so we expect different handling
        try:
            url = f"{self.base_url}/reports/pdf/{self.student_id}?start_date={start_date}&end_date={end_date}"
            headers = {'Authorization': f'Bearer {self.token}'}
            response = requests.get(url, headers=headers)
            
            if response.status_code == 200:
                self.log_test("Generate PDF Report", True)
                print(f"   ✓ PDF generated, size: {len(response.content)} bytes")
            else:
                self.log_test("Generate PDF Report", False, f"Status: {response.status_code}")
        except Exception as e:
            self.log_test("Generate PDF Report", False, str(e))

    def test_profile_management(self):
        """Test profile management"""
        print("\n" + "="*50)
        print("TESTING PROFILE MANAGEMENT")
        print("="*50)
        
        # Update profile
        profile_data = {
            "full_name": "Updated Test User",
            "age": 35,
            "subject": "Fizik"
        }
        
        # Note: The API expects query parameters, not JSON body
        try:
            url = f"{self.base_url}/teacher/profile"
            headers = {'Authorization': f'Bearer {self.token}'}
            response = requests.put(url, headers=headers, params=profile_data)
            
            if response.status_code == 200:
                self.log_test("Update Profile", True)
            else:
                self.log_test("Update Profile", False, f"Status: {response.status_code}")
        except Exception as e:
            self.log_test("Update Profile", False, str(e))

    def test_social_features(self):
        """Test social platform features - posts, likes, comments, notifications"""
        print("\n" + "="*50)
        print("TESTING SOCIAL PLATFORM FEATURES")
        print("="*50)
        
        # Create a second user for interaction testing
        timestamp = datetime.now().strftime('%H%M%S')
        user2_email = f"test_user2_{timestamp}@test.com"
        user2_data = {
            "email": user2_email,
            "password": "TestPass123!",
            "full_name": "Test User 2",
            "age": 25,
            "subject": "Fizik"
        }
        
        response = self.run_test(
            "Register Second User",
            "POST",
            "auth/register",
            200,
            data=user2_data
        )
        
        user2_token = None
        user2_id = None
        if response and 'token' in response:
            user2_token = response['token']
            user2_id = response['user']['id']
            print(f"   ✓ Second user created with ID: {user2_id}")
        
        # Test Posts API
        post_data = {
            "content": "Bu benim ilk test gönderim! Matematik dersleri çok eğlenceli geçiyor.",
            "media": [],
            "visibility": "public"
        }
        
        response = self.run_test(
            "Create Post",
            "POST",
            "posts",
            200,
            data=post_data
        )
        
        post_id = None
        if response and 'id' in response:
            post_id = response['id']
            print(f"   ✓ Post created with ID: {post_id}")
        
        # Test Feed API
        response = self.run_test(
            "Get Feed (All)",
            "GET",
            "feed?type=all",
            200
        )
        
        if response and isinstance(response, list):
            print(f"   ✓ Feed contains {len(response)} items")
        
        # Test Posts Feed
        self.run_test(
            "Get Posts Feed",
            "GET",
            "feed?type=posts",
            200
        )
        
        # Test Get All Posts
        self.run_test(
            "Get All Posts",
            "GET",
            "posts",
            200
        )
        
        if post_id and user2_token:
            # Switch to second user for interactions
            original_token = self.token
            self.token = user2_token
            
            # Test Like Post
            response = self.run_test(
                "Like Post",
                "POST",
                f"posts/{post_id}/like",
                200
            )
            
            if response:
                print(f"   ✓ Like response: {response.get('message', 'N/A')}")
            
            # Test Get Post Likes
            response = self.run_test(
                "Get Post Likes",
                "GET",
                f"posts/{post_id}/likes",
                200
            )
            
            if response and isinstance(response, list):
                print(f"   ✓ Post has {len(response)} likes")
            
            # Test Comment on Post
            comment_data = {
                "content": "Harika bir paylaşım! Ben de matematik öğretmeniyim."
            }
            
            response = self.run_test(
                "Create Comment",
                "POST",
                f"posts/{post_id}/comments",
                200,
                data=comment_data
            )
            
            comment_id = None
            if response and 'id' in response:
                comment_id = response['id']
                print(f"   ✓ Comment created with ID: {comment_id}")
            
            # Test Get Post Comments
            response = self.run_test(
                "Get Post Comments",
                "GET",
                f"posts/{post_id}/comments",
                200
            )
            
            if response and isinstance(response, list):
                print(f"   ✓ Post has {len(response)} comments")
            
            # Switch back to original user to check notifications
            self.token = original_token
            
            # Test Notifications API
            response = self.run_test(
                "Get Notifications",
                "GET",
                "notifications",
                200
            )
            
            if response and isinstance(response, list):
                print(f"   ✓ User has {len(response)} notifications")
                
                # Check for like and comment notifications
                like_notifications = [n for n in response if n.get('type') == 'like']
                comment_notifications = [n for n in response if n.get('type') == 'comment']
                
                if like_notifications:
                    print(f"   ✓ Found {len(like_notifications)} like notifications")
                if comment_notifications:
                    print(f"   ✓ Found {len(comment_notifications)} comment notifications")
            
            # Test Unread Count
            response = self.run_test(
                "Get Unread Notifications Count",
                "GET",
                "notifications/unread-count",
                200
            )
            
            if response and 'count' in response:
                print(f"   ✓ Unread notifications count: {response['count']}")
            
            # Test Mark All Notifications as Read
            self.run_test(
                "Mark All Notifications Read",
                "POST",
                "notifications/read-all",
                200
            )
            
            # Verify unread count is now 0
            response = self.run_test(
                "Verify Unread Count After Mark Read",
                "GET",
                "notifications/unread-count",
                200
            )
            
            if response and response.get('count') == 0:
                print("   ✓ All notifications marked as read successfully")
            
            # Test Delete Comment (switch back to user2)
            if comment_id:
                self.token = user2_token
                self.run_test(
                    "Delete Comment",
                    "DELETE",
                    f"comments/{comment_id}",
                    200
                )
                self.token = original_token
        
        # Test Delete Post
        if post_id:
            self.run_test(
                "Delete Post",
                "DELETE",
                f"posts/{post_id}",
                200
            )

    def test_new_mentra_features(self):
        """Test the new Mentra features as requested"""
        print("\n" + "="*50)
        print("TESTING NEW MENTRA FEATURES")
        print("="*50)
        
        # Test 1: Lesson Time Conflict Prevention
        print("\n🔍 Testing Lesson Time Conflict Prevention...")
        
        if not self.student_id:
            # Create a student first for lesson testing
            student_data = {
                "full_name": "Conflict Test Öğrenci",
                "grade": "10. Sınıf",
                "hourly_rate": 200.0,
                "guardian_name": "Test Veli",
                "guardian_email": "veli@test.com"
            }
            
            response = self.run_test(
                "Create Student for Conflict Test",
                "POST",
                "students",
                200,
                data=student_data
            )
            
            if response and 'id' in response:
                self.student_id = response['id']
        
        # Create first lesson at specific time
        lesson1_data = {
            "student_id": self.student_id,
            "day_of_week": 2,  # Wednesday
            "start_time": "10:00",
            "end_time": "11:00",
            "topic": "Matematik - İlk Ders",
            "status": "scheduled"
        }
        
        response = self.run_test(
            "Create First Lesson (10:00-11:00)",
            "POST",
            "lessons",
            200,
            data=lesson1_data
        )
        
        first_lesson_id = None
        if response and 'id' in response:
            first_lesson_id = response['id']
            print(f"   ✓ First lesson created: {first_lesson_id}")
        
        # Try to create overlapping lesson (should fail with 400)
        lesson2_data = {
            "student_id": self.student_id,
            "day_of_week": 2,  # Same day (Wednesday)
            "start_time": "10:30",  # Overlaps with first lesson
            "end_time": "11:30",
            "topic": "Matematik - Çakışan Ders",
            "status": "scheduled"
        }
        
        try:
            url = f"{self.base_url}/lessons"
            headers = {'Authorization': f'Bearer {self.token}', 'Content-Type': 'application/json'}
            response = requests.post(url, json=lesson2_data, headers=headers)
            
            if response.status_code == 400:
                self.log_test("Lesson Time Conflict Prevention", True)
                try:
                    error_detail = response.json()
                    print(f"   ✓ Conflict detected: {error_detail.get('detail', 'Time conflict error')}")
                except:
                    print(f"   ✓ Conflict detected: Status 400 returned")
            else:
                self.log_test("Lesson Time Conflict Prevention", False, f"Expected 400, got {response.status_code}")
        except Exception as e:
            self.log_test("Lesson Time Conflict Prevention", False, str(e))
        
        # Try to create lesson at different time (should succeed)
        lesson3_data = {
            "student_id": self.student_id,
            "day_of_week": 2,  # Same day (Wednesday)
            "start_time": "14:00",  # Different time, no overlap
            "end_time": "15:00",
            "topic": "Matematik - Farklı Saat",
            "status": "scheduled"
        }
        
        response = self.run_test(
            "Create Lesson at Different Time (14:00-15:00)",
            "POST",
            "lessons",
            200,
            data=lesson3_data
        )
        
        second_lesson_id = None
        if response and 'id' in response:
            second_lesson_id = response['id']
            print(f"   ✓ Second lesson created successfully: {second_lesson_id}")
        
        # Test update lesson with conflict
        if first_lesson_id:
            update_data = {
                "student_id": self.student_id,
                "day_of_week": 2,
                "start_time": "14:30",  # Would overlap with second lesson
                "end_time": "15:30",
                "topic": "Updated lesson with conflict",
                "status": "scheduled"
            }
            
            try:
                url = f"{self.base_url}/lessons/{first_lesson_id}"
                headers = {'Authorization': f'Bearer {self.token}', 'Content-Type': 'application/json'}
                response = requests.put(url, json=update_data, headers=headers)
                
                if response.status_code == 400:
                    self.log_test("Update Lesson Time Conflict Prevention", True)
                    print(f"   ✓ Update conflict detected correctly")
                else:
                    self.log_test("Update Lesson Time Conflict Prevention", False, f"Expected 400, got {response.status_code}")
            except Exception as e:
                self.log_test("Update Lesson Time Conflict Prevention", False, str(e))
        
        # Test 2: Payment Status Update
        print("\n🔍 Testing Payment Status Update...")
        
        # Create a payment with "Beklemede" status
        payment_data = {
            "student_id": self.student_id,
            "amount": 250.0,
            "date": datetime.now().strftime('%Y-%m-%d'),
            "status": "Beklemede"
        }
        
        response = self.run_test(
            "Create Payment with Beklemede Status",
            "POST",
            "payments",
            200,
            data=payment_data
        )
        
        payment_id = None
        if response and 'id' in response:
            payment_id = response['id']
            print(f"   ✓ Payment created with ID: {payment_id}")
        
        # Update payment status to "Ödendi"
        if payment_id:
            update_payment_data = {
                "student_id": self.student_id,
                "amount": 250.0,
                "date": datetime.now().strftime('%Y-%m-%d'),
                "status": "Ödendi"
            }
            
            response = self.run_test(
                "Update Payment Status to Ödendi",
                "PUT",
                f"payments/{payment_id}",
                200,
                data=update_payment_data
            )
            
            if response and response.get('status') == 'Ödendi':
                print(f"   ✓ Payment status updated successfully: {response.get('status')}")
            
        # Test 3: Follower/Following Endpoints
        print("\n🔍 Testing Follower/Following Endpoints...")
        
        # Create a second user for follow testing
        timestamp = datetime.now().strftime('%H%M%S')
        user2_email = f"follow_test_{timestamp}@test.com"
        user2_data = {
            "email": user2_email,
            "password": "TestPass123!",
            "full_name": "Follow Test User",
            "age": 28,
            "subject": "Kimya"
        }
        
        response = self.run_test(
            "Create Second User for Follow Test",
            "POST",
            "auth/register",
            200,
            data=user2_data
        )
        
        user2_token = None
        user2_id = None
        user2_username = None
        if response and 'token' in response:
            user2_token = response['token']
            user2_id = response['user']['id']
            user2_username = response['user']['username']
            print(f"   ✓ Second user created: {user2_username}")
        
        # Follow the second user
        if user2_id:
            response = self.run_test(
                "Follow Second User",
                "POST",
                f"users/{user2_id}/follow",
                200
            )
        
        # Test GET /users/{username} with follower/following counts
        if user2_username:
            response = self.run_test(
                "Get User Profile with Counts",
                "GET",
                f"users/{user2_username}",
                200
            )
            
            if response:
                if 'follower_count' in response and 'following_count' in response:
                    print(f"   ✓ Profile includes follower_count: {response['follower_count']}")
                    print(f"   ✓ Profile includes following_count: {response['following_count']}")
                    self.log_test("User Profile Follower/Following Counts", True)
                else:
                    self.log_test("User Profile Follower/Following Counts", False, "Missing count fields")
        
        # Test GET /users/{user_id}/followers
        if user2_id:
            response = self.run_test(
                "Get User Followers List",
                "GET",
                f"users/{user2_id}/followers",
                200
            )
            
            if response and isinstance(response, list):
                print(f"   ✓ Followers list returned: {len(response)} followers")
                if len(response) > 0:
                    print(f"   ✓ First follower: {response[0].get('full_name', 'N/A')}")
        
        # Test GET /users/{user_id}/following
        current_user_id = self.user_id
        if current_user_id:
            response = self.run_test(
                "Get User Following List",
                "GET",
                f"users/{current_user_id}/following",
                200
            )
            
            if response and isinstance(response, list):
                print(f"   ✓ Following list returned: {len(response)} following")
                if len(response) > 0:
                    print(f"   ✓ First following: {response[0].get('full_name', 'N/A')}")
        
        # Test 4: Notification Username
        print("\n🔍 Testing Notification Username...")
        
        # Create a post to generate notifications
        post_data = {
            "content": "Test post for notification username testing",
            "media": [],
            "visibility": "public"
        }
        
        response = self.run_test(
            "Create Post for Notification Test",
            "POST",
            "posts",
            200,
            data=post_data
        )
        
        post_id = None
        if response and 'id' in response:
            post_id = response['id']
            print(f"   ✓ Test post created: {post_id}")
        
        # Switch to second user and like/comment on the post
        if post_id and user2_token:
            original_token = self.token
            self.token = user2_token
            
            # Like the post (should create notification)
            response = self.run_test(
                "Like Post (Generate Notification)",
                "POST",
                f"posts/{post_id}/like",
                200
            )
            
            # Comment on the post (should create notification)
            comment_data = {
                "content": "Great post! This is a test comment."
            }
            
            response = self.run_test(
                "Comment on Post (Generate Notification)",
                "POST",
                f"posts/{post_id}/comments",
                200,
                data=comment_data
            )
            
            # Switch back to original user
            self.token = original_token
            
            # Check notifications for actor_username field
            response = self.run_test(
                "Get Notifications with Actor Username",
                "GET",
                "notifications",
                200
            )
            
            if response and isinstance(response, list):
                print(f"   ✓ Retrieved {len(response)} notifications")
                
                # Check for actor_username in notifications
                notifications_with_username = [n for n in response if n.get('actor_username')]
                if notifications_with_username:
                    print(f"   ✓ Found {len(notifications_with_username)} notifications with actor_username")
                    for notif in notifications_with_username[:2]:  # Show first 2
                        print(f"   ✓ Notification type: {notif.get('type')}, actor_username: {notif.get('actor_username')}")
                    self.log_test("Notification Actor Username Field", True)
                else:
                    self.log_test("Notification Actor Username Field", False, "No notifications with actor_username found")

    def cleanup_test_data(self):
        """Clean up test data"""
        print("\n" + "="*50)
        print("CLEANING UP TEST DATA")
        print("="*50)
        
        # Delete student (this should cascade delete lessons, sessions, payments)
        if self.student_id:
            self.run_test(
                "Delete Student (Cascade)",
                "DELETE",
                f"students/{self.student_id}",
                200
            )

    def run_all_tests(self):
        """Run all tests"""
        print("🚀 Starting Mentra API Tests")
        print(f"Backend URL: {self.base_url}")
        
        # Run test suites
        self.test_auth_flow()
        self.test_dashboard()
        self.test_student_crud()
        self.test_lesson_management()
        self.test_lesson_completion_with_debt()
        self.test_payment_management()
        self.test_session_management()
        self.test_social_features()
        self.test_reports()
        self.test_profile_management()
        self.test_new_mentra_features()  # Add the new feature tests
        self.cleanup_test_data()
        
        # Print summary
        print("\n" + "="*60)
        print("TEST SUMMARY")
        print("="*60)
        print(f"Total Tests: {self.tests_run}")
        print(f"Passed: {self.tests_passed}")
        print(f"Failed: {self.tests_run - self.tests_passed}")
        print(f"Success Rate: {(self.tests_passed/self.tests_run*100):.1f}%")
        
        # Print failed tests
        failed_tests = [t for t in self.test_results if not t['success']]
        if failed_tests:
            print("\n❌ FAILED TESTS:")
            for test in failed_tests:
                print(f"   • {test['test']}: {test['details']}")
        
        return self.tests_passed == self.tests_run

def main():
    tester = MentraAPITester()
    success = tester.run_all_tests()
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())
const { execSync } = require('child_process');

const BASE_URL = 'http://localhost:3000/api/v1';

const results = [];

function recordResult(stepNumber, stepName, status, httpCode, details = {}) {
  const result = {
    step: `Step ${stepNumber}`,
    name: stepName,
    status: status ? 'PASS' : 'FAIL',
    httpCode: httpCode || 'N/A',
    details,
  };
  results.push(result);
  console.log(
    `[${result.status}] ${result.step}: ${result.name} (HTTP ${result.httpCode})`
  );
  if (details && Object.keys(details).length > 0) {
    console.log(`   Details:`, JSON.stringify(details, null, 2));
  }
}

function runDockerCmd(command) {
  try {
    const output = execSync(command, { encoding: 'utf-8' });
    return output.trim();
  } catch (err) {
    console.error(`Docker command failed: ${command}`, err.message);
    throw err;
  }
}

async function request(path, options = {}) {
  const url = `${BASE_URL}${path}`;
  const defaultHeaders = {
    'Content-Type': 'application/json',
    'User-Agent': 'E2E-Diagnostic-Runner/1.0',
  };

  const config = {
    ...options,
    headers: {
      ...defaultHeaders,
      ...(options.headers || {}),
    },
  };

  if (config.body && typeof config.body === 'object') {
    config.body = JSON.stringify(config.body);
  }

  const response = await fetch(url, config);
  const text = await response.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch (e) {
    json = { rawText: text };
  }

  return {
    status: response.status,
    headers: response.headers,
    data: json,
  };
}

async function runE2EFlow() {
  console.log('===============================================================');
  console.log('🚀 Starting Comprehensive E2E System Flow & Diagnostic Run');
  console.log(`🌐 Target Base URL: ${BASE_URL}`);
  console.log('===============================================================\n');

  let superAdminToken = null;
  let superAdminId = null;
  let cinemaAdminToken = null;
  let cinemaAdminId = null;
  let movieId = null;
  let cinemaId = null;
  let imaxAuditoriumId = null;
  let vipAuditoriumId = null;
  let showtime1Id = null;
  let showtime2Id = null;

  const superAdminEmail = `admin.super.${Date.now()}@test.com`;
  const cinemaAdminEmail = `cinema.admin.${Date.now()}@test.com`;
  const password = 'Password123!';

  // =========================================================================
  // STEP 1: Super Admin Provisioning & Verification
  // =========================================================================
  console.log('\n--- Step 1: Super Admin Provisioning & Verification ---');

  // 1.1 Register Super Admin
  const regSuperRes = await request('/users/auth/register', {
    method: 'POST',
    body: {
      name: 'Super Administrator',
      email: superAdminEmail,
      password,
      country: 'Egypt',
      gender: 'male',
    },
  });

  const superAdminRegistered =
    regSuperRes.status === 201 || regSuperRes.status === 200;
  recordResult(
    '1.1',
    'Register Super Admin',
    superAdminRegistered,
    regSuperRes.status,
    { email: superAdminEmail, response: regSuperRes.data }
  );

  // 1.2 Fetch OTP from Redis
  let superOtp = '';
  try {
    const rawOtp = runDockerCmd(
      `docker exec redis redis-cli GET "otp:verify-email:${superAdminEmail}"`
    );
    superOtp = rawOtp.replace(/[\r\n"]/g, '').trim();
    recordResult('1.2', 'Fetch Super Admin OTP from Redis', !!superOtp, 200, {
      redisKey: `otp:verify-email:${superAdminEmail}`,
      otp: superOtp,
    });
  } catch (err) {
    recordResult(
      '1.2',
      'Fetch Super Admin OTP from Redis',
      false,
      'ERR',
      err.message
    );
  }

  // 1.3 Verify Super Admin Email
  const verifySuperRes = await request('/users/auth/verify-email', {
    method: 'POST',
    body: {
      email: superAdminEmail,
      code: superOtp,
    },
  });
  const superAdminVerified = verifySuperRes.status === 200;
  recordResult(
    '1.3',
    'Verify Super Admin Account',
    superAdminVerified,
    verifySuperRes.status,
    verifySuperRes.data
  );

  // 1.4 Elevate Role to SUPER_ADMIN in PostgreSQL
  try {
    runDockerCmd(
      `docker exec postgres psql -U postgres -d Booking-Users -c "UPDATE users SET role = 'super_admin' WHERE email = '${superAdminEmail}';"`
    );
    const superRoleCheck = runDockerCmd(
      `docker exec postgres psql -U postgres -d Booking-Users -t -A -c "SELECT role FROM users WHERE email = '${superAdminEmail}';"`
    );
    const elevated = superRoleCheck.includes('super_admin');
    recordResult('1.4', 'Elevate Super Admin Role via SQL', elevated, 200, {
      newRole: superRoleCheck,
    });
  } catch (err) {
    recordResult(
      '1.4',
      'Elevate Super Admin Role via SQL',
      false,
      'ERR',
      err.message
    );
  }

  // 1.5 Authenticate Super Admin
  const loginSuperRes = await request('/users/auth/login', {
    method: 'POST',
    body: {
      email: superAdminEmail,
      password,
    },
  });

  const superLoginSuccess =
    loginSuperRes.status === 200 &&
    (loginSuperRes.data?.data?.accessToken ||
      loginSuperRes.data?.data?.access_token ||
      loginSuperRes.data?.accessToken);

  superAdminToken =
    loginSuperRes.data?.data?.accessToken ||
    loginSuperRes.data?.data?.access_token ||
    loginSuperRes.data?.accessToken;
  superAdminId =
    loginSuperRes.data?.data?.user?.id || loginSuperRes.data?.user?.id;

  recordResult(
    '1.5',
    'Authenticate Super Admin (Login)',
    superLoginSuccess,
    loginSuperRes.status,
    {
      superAdminId,
      tokenReceived: !!superAdminToken,
    }
  );

  // =========================================================================
  // STEP 2: Cinema Admin Provisioning & Verification
  // =========================================================================
  console.log('\n--- Step 2: Cinema Admin Provisioning & Verification ---');

  // 2.1 Register Cinema Admin
  const regCinemaAdminRes = await request('/users/auth/register', {
    method: 'POST',
    body: {
      name: 'Cinema Branch Manager',
      email: cinemaAdminEmail,
      password,
      country: 'Egypt',
      gender: 'male',
    },
  });
  const cinemaAdminRegistered =
    regCinemaAdminRes.status === 201 || regCinemaAdminRes.status === 200;
  recordResult(
    '2.1',
    'Register Cinema Admin',
    cinemaAdminRegistered,
    regCinemaAdminRes.status,
    { email: cinemaAdminEmail }
  );

  // 2.2 Fetch OTP from Redis
  let cinemaOtp = '';
  try {
    const rawOtp = runDockerCmd(
      `docker exec redis redis-cli GET "otp:verify-email:${cinemaAdminEmail}"`
    );
    cinemaOtp = rawOtp.replace(/[\r\n"]/g, '').trim();
    recordResult('2.2', 'Fetch Cinema Admin OTP from Redis', !!cinemaOtp, 200, {
      redisKey: `otp:verify-email:${cinemaAdminEmail}`,
      otp: cinemaOtp,
    });
  } catch (err) {
    recordResult(
      '2.2',
      'Fetch Cinema Admin OTP from Redis',
      false,
      'ERR',
      err.message
    );
  }

  // 2.3 Verify Cinema Admin Email
  const verifyCinemaAdminRes = await request('/users/auth/verify-email', {
    method: 'POST',
    body: {
      email: cinemaAdminEmail,
      code: cinemaOtp,
    },
  });
  const cinemaAdminVerified = verifyCinemaAdminRes.status === 200;
  recordResult(
    '2.3',
    'Verify Cinema Admin Account',
    cinemaAdminVerified,
    verifyCinemaAdminRes.status,
    verifyCinemaAdminRes.data
  );

  // 2.4 Elevate Role to CINEMA_ADMIN in PostgreSQL
  try {
    runDockerCmd(
      `docker exec postgres psql -U postgres -d Booking-Users -c "UPDATE users SET role = 'cinema_admin' WHERE email = '${cinemaAdminEmail}';"`
    );
    const cinemaRoleCheck = runDockerCmd(
      `docker exec postgres psql -U postgres -d Booking-Users -t -A -c "SELECT role FROM users WHERE email = '${cinemaAdminEmail}';"`
    );
    const elevated = cinemaRoleCheck.includes('cinema_admin');
    recordResult('2.4', 'Elevate Cinema Admin Role via SQL', elevated, 200, {
      newRole: cinemaRoleCheck,
    });
  } catch (err) {
    recordResult(
      '2.4',
      'Elevate Cinema Admin Role via SQL',
      false,
      'ERR',
      err.message
    );
  }

  // 2.5 Extract Cinema Admin User ID
  try {
    cinemaAdminId = runDockerCmd(
      `docker exec postgres psql -U postgres -d Booking-Users -t -A -c "SELECT id FROM users WHERE email = '${cinemaAdminEmail}';"`
    );
    recordResult(
      '2.5',
      'Extract Cinema Admin ID from DB',
      !!cinemaAdminId,
      200,
      { cinemaAdminId }
    );
  } catch (err) {
    recordResult(
      '2.5',
      'Extract Cinema Admin ID from DB',
      false,
      'ERR',
      err.message
    );
  }

  // 2.6 Authenticate Cinema Admin
  const loginCinemaAdminRes = await request('/users/auth/login', {
    method: 'POST',
    body: {
      email: cinemaAdminEmail,
      password,
    },
  });

  const cinemaAdminLoginSuccess =
    loginCinemaAdminRes.status === 200 &&
    (loginCinemaAdminRes.data?.data?.accessToken ||
      loginCinemaAdminRes.data?.data?.access_token ||
      loginCinemaAdminRes.data?.accessToken);

  cinemaAdminToken =
    loginCinemaAdminRes.data?.data?.accessToken ||
    loginCinemaAdminRes.data?.data?.access_token ||
    loginCinemaAdminRes.data?.accessToken;

  recordResult(
    '2.6',
    'Authenticate Cinema Admin (Login)',
    cinemaAdminLoginSuccess,
    loginCinemaAdminRes.status,
    {
      cinemaAdminId,
      tokenReceived: !!cinemaAdminToken,
    }
  );

  // =========================================================================
  // STEP 3: Catalog Setup & Cinema Delegation
  // =========================================================================
  console.log('\n--- Step 3: Catalog Setup & Cinema Delegation ---');

  // 3.1 Fetch Seeded Genres
  const genresRes = await request('/movies/genres', { method: 'GET' });
  const rawGenres =
    genresRes.data?.data?.genres ||
    genresRes.data?.genres ||
    genresRes.data?.data ||
    [];
  const sciFiGenre = rawGenres.find(
    (g) => g.slug === 'sci-fi' || g.name === 'Sci-Fi'
  );
  const actionGenre = rawGenres.find(
    (g) => g.slug === 'action' || g.name === 'Action'
  );
  const selectedGenreIds = [
    sciFiGenre?.id || rawGenres[0]?.id,
    actionGenre?.id || rawGenres[1]?.id,
  ].filter(Boolean);

  recordResult(
    '3.1',
    'Fetch Seeded Genres',
    genresRes.status === 200 && selectedGenreIds.length > 0,
    genresRes.status,
    {
      totalGenres: rawGenres.length,
      selectedGenreIds,
    }
  );

  // 3.2 Create Movie (Super Admin)
  const moviePayload = {
    title: 'Interstellar Odyssey',
    description:
      'A team of explorers travel through a wormhole in space in an attempt to ensure humanity survival.',
    durationMinutes: 169,
    releaseDate: '2026-11-07',
    ageRating: 'PG_13',
    originalLanguage: 'en',
    spokenLanguages: ['en'],
    subtitles: ['ar', 'fr'],
    posterUrl: 'https://images.unsplash.com/photo-1534447677768-be436bb09401',
    bannerUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23',
    trailerUrl: 'https://www.youtube.com/watch?v=zSWdZVtXT7E',
    galleryUrls: [
      'https://images.unsplash.com/photo-1451187580459-43490279c0fa',
      'https://images.unsplash.com/photo-1446776811953-b23d57bd21aa',
    ],
    directors: ['Christopher Nolan'],
    cast: ['Matthew McConaughey', 'Anne Hathaway', 'Jessica Chastain'],
    genreIds: selectedGenreIds,
  };

  const createMovieRes = await request('/movies', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${superAdminToken}`,
    },
    body: moviePayload,
  });

  const movieCreated =
    createMovieRes.status === 201 || createMovieRes.status === 200;
  movieId =
    createMovieRes.data?.data?.id ||
    createMovieRes.data?.data?.movie?.id ||
    createMovieRes.data?.data?.user?.id ||
    createMovieRes.data?.id;

  recordResult('3.2', 'Create Movie (Super Admin)', movieCreated, createMovieRes.status, {
    movieId,
    title: moviePayload.title,
    response: createMovieRes.data,
  });

  // 3.3 Create Cinema with Admin Assignment (Super Admin)
  const cinemaPayload = {
    name: 'Grand Galaxy Cinema',
    city: 'Cairo',
    address: '123 Nile Corniche, Downtown',
    description:
      'Flagship cinema featuring state-of-the-art IMAX and VIP screening rooms.',
    thumbnailUrl:
      'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba',
    galleryUrls: [
      'https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c',
    ],
    adminUserIds: [cinemaAdminId],
  };

  const createCinemaRes = await request('/cinemas', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${superAdminToken}`,
    },
    body: cinemaPayload,
  });

  const cinemaCreated =
    createCinemaRes.status === 201 || createCinemaRes.status === 200;
  cinemaId =
    createCinemaRes.data?.data?.id ||
    createCinemaRes.data?.data?.cinema?.id ||
    createCinemaRes.data?.data?.user?.id ||
    createCinemaRes.data?.id;

  recordResult(
    '3.3',
    'Create Cinema with Admin Assignment (Super Admin)',
    cinemaCreated,
    createCinemaRes.status,
    {
      cinemaId,
      assignedAdmin: cinemaAdminId,
      response: createCinemaRes.data,
    }
  );

  // 3.4 Verify Cinema Admin Assignment
  const getAdminsRes = await request(`/cinemas/${cinemaId}/admins`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${superAdminToken}`,
    },
  });

  const adminList =
    getAdminsRes.data?.data?.admin_user_ids ||
    getAdminsRes.data?.data?.adminUserIds ||
    getAdminsRes.data?.admin_user_ids ||
    getAdminsRes.data?.adminUserIds ||
    [];

  const adminMapped = adminList.includes(cinemaAdminId);

  recordResult(
    '3.4',
    'Verify Cinema Admin Assignment',
    getAdminsRes.status === 200 && adminMapped,
    getAdminsRes.status,
    {
      cinemaId,
      expectedAdmin: cinemaAdminId,
      retrievedAdmins: adminList,
    }
  );

  // =========================================================================
  // STEP 4: Auditoriums, Showtimes & Pricing Configuration
  // =========================================================================
  console.log('\n--- Step 4: Auditoriums, Showtimes & Pricing Configuration ---');

  // 4.1.1 Create IMAX Auditorium (5 rows * 10 columns = 50 seats)
  const createImaxRes = await request(`/cinemas/${cinemaId}/auditoriums`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${cinemaAdminToken}`,
    },
    body: {
      name: 'IMAX Hall 1',
      experienceType: 'IMAX_3D',
      soundSystem: 'Dolby Atmos 12.1',
      totalRows: 5,
      totalColumns: 10,
    },
  });

  const imaxCreated = createImaxRes.status === 201;
  imaxAuditoriumId =
    createImaxRes.data?.data?.id ||
    createImaxRes.data?.data?.auditorium?.id ||
    createImaxRes.data?.id;
  const imaxSeats =
    createImaxRes.data?.data?.total_seats ??
    createImaxRes.data?.data?.totalSeats ??
    createImaxRes.data?.total_seats ??
    createImaxRes.data?.totalSeats;

  recordResult(
    '4.1.1',
    'Create IMAX Auditorium (5x10 = 50 seats)',
    imaxCreated && imaxSeats === 50,
    createImaxRes.status,
    {
      auditoriumId: imaxAuditoriumId,
      totalSeats: imaxSeats,
      response: createImaxRes.data,
    }
  );

  // 4.1.2 Create VIP Auditorium (4 rows * 8 columns = 32 seats)
  const createVipRes = await request(`/cinemas/${cinemaId}/auditoriums`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${cinemaAdminToken}`,
    },
    body: {
      name: 'VIP Lounge 1',
      experienceType: 'VIP_LOUNGE',
      soundSystem: 'Dolby Surround 7.1',
      totalRows: 4,
      totalColumns: 8,
    },
  });

  const vipCreated = createVipRes.status === 201;
  vipAuditoriumId =
    createVipRes.data?.data?.id ||
    createVipRes.data?.data?.auditorium?.id ||
    createVipRes.data?.id;
  const vipSeats =
    createVipRes.data?.data?.total_seats ??
    createVipRes.data?.data?.totalSeats ??
    createVipRes.data?.total_seats ??
    createVipRes.data?.totalSeats;

  recordResult(
    '4.1.2',
    'Create VIP Auditorium (4x8 = 32 seats)',
    vipCreated && vipSeats === 32,
    createVipRes.status,
    {
      auditoriumId: vipAuditoriumId,
      totalSeats: vipSeats,
      response: createVipRes.data,
    }
  );

  // 4.2.1 Schedule Showtime 1 (18:00 - 20:49)
  const showtime1Payload = {
    movieId,
    auditoriumId: imaxAuditoriumId,
    startTime: '2026-09-01T18:00:00.000Z',
    endTime: '2026-09-01T20:49:00.000Z',
    experienceType: 'IMAX_3D',
    basePrice: 150,
  };

  const createShowtime1Res = await request('/showtimes', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${cinemaAdminToken}`,
    },
    body: showtime1Payload,
  });

  const showtime1Created = createShowtime1Res.status === 201;
  showtime1Id =
    createShowtime1Res.data?.data?.id ||
    createShowtime1Res.data?.data?.showtime?.id ||
    createShowtime1Res.data?.id;

  recordResult(
    '4.2.1',
    'Schedule Showtime 1 (18:00 - 20:49)',
    showtime1Created,
    createShowtime1Res.status,
    {
      showtime1Id,
      startTime: showtime1Payload.startTime,
      endTime: showtime1Payload.endTime,
      response: createShowtime1Res.data,
    }
  );

  // 4.2.2 Collision Test (Negative Test): Attempt at 20:55 (within 20m buffer window ending at 21:09)
  const collisionPayload = {
    movieId,
    auditoriumId: imaxAuditoriumId,
    startTime: '2026-09-01T20:55:00.000Z',
    endTime: '2026-09-01T23:44:00.000Z',
    experienceType: 'IMAX_3D',
    basePrice: 150,
  };

  const collisionRes = await request('/showtimes', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${cinemaAdminToken}`,
    },
    body: collisionPayload,
  });

  const collisionBlocked = collisionRes.status === 409;
  recordResult(
    '4.2.2',
    'Collision Test: 20-min Buffer Enforcement (Negative Test)',
    collisionBlocked,
    collisionRes.status,
    {
      attemptedStartTime: collisionPayload.startTime,
      expectedStatus: 409,
      actualStatus: collisionRes.status,
      response: collisionRes.data,
    }
  );

  // 4.2.3 Schedule Showtime 2 (Positive Test): After buffer at 21:15
  const showtime2Payload = {
    movieId,
    auditoriumId: imaxAuditoriumId,
    startTime: '2026-09-01T21:15:00.000Z',
    endTime: '2026-09-02T00:04:00.000Z',
    experienceType: 'IMAX_3D',
    basePrice: 150,
  };

  const createShowtime2Res = await request('/showtimes', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${cinemaAdminToken}`,
    },
    body: showtime2Payload,
  });

  const showtime2Created = createShowtime2Res.status === 201;
  showtime2Id =
    createShowtime2Res.data?.data?.id ||
    createShowtime2Res.data?.data?.showtime?.id ||
    createShowtime2Res.data?.id;

  recordResult(
    '4.2.3',
    'Schedule Showtime 2 (Positive Test: 21:15 - 00:04)',
    showtime2Created,
    createShowtime2Res.status,
    {
      showtime2Id,
      startTime: showtime2Payload.startTime,
      endTime: showtime2Payload.endTime,
    }
  );

  // 4.3 Set Tiered Seat Pricing
  const pricingPayload = [
    { seatType: 'REGULAR', price: 120 },
    { seatType: 'PREMIUM', price: 180 },
    { seatType: 'VIP', price: 250 },
  ];

  const pricingRes = await request(`/showtimes/${showtime1Id}/pricing`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${cinemaAdminToken}`,
    },
    body: pricingPayload,
  });

  const pricingSet = pricingRes.status === 200;
  const pricingsList =
    pricingRes.data?.data?.seat_pricings ||
    pricingRes.data?.seat_pricings ||
    [];

  recordResult('4.3', 'Set Tiered Seat Pricing', pricingSet, pricingRes.status, {
    showtimeId: showtime1Id,
    tiersConfigured: pricingsList.length,
    pricings: pricingsList,
  });

  // =========================================================================
  // STEP 5: Aggregation & Final Inspection
  // =========================================================================
  console.log('\n--- Step 5: Aggregation & Final Inspection ---');

  const groupedRes = await request(
    `/showtimes/grouped?movieId=${movieId}&date=2026-09-01`,
    {
      method: 'GET',
    }
  );

  const groupedSuccess = groupedRes.status === 200;
  const groupedData = groupedRes.data?.data || groupedRes.data;
  const cinemaGroup = groupedData?.cinemas?.[0];
  const groupedShowtimes = cinemaGroup?.showtimes || [];

  const hasNestedCinema = !!cinemaGroup?.cinema?.name;
  const hasNestedAuditorium = !!groupedShowtimes[0]?.auditorium?.name;
  const hasNestedPricings =
    Array.isArray(groupedShowtimes[0]?.seat_pricings) &&
    groupedShowtimes[0]?.seat_pricings.length > 0;

  const validHierarchy =
    groupedSuccess &&
    hasNestedCinema &&
    hasNestedAuditorium &&
    hasNestedPricings;

  recordResult(
    '5.1',
    'Query Grouped Showtimes & Validate Nested Hierarchy',
    validHierarchy,
    groupedRes.status,
    {
      movieId,
      queryDate: '2026-09-01',
      totalCinemas: groupedData?.cinemas?.length,
      cinemaName: cinemaGroup?.cinema?.name,
      showtimesFound: groupedShowtimes.length,
      sampleShowtime: {
        id: groupedShowtimes[0]?.id,
        auditorium: groupedShowtimes[0]?.auditorium,
        seatPricings: groupedShowtimes[0]?.seat_pricings,
      },
    }
  );

  console.log('\n===============================================================');
  console.log('🏁 Execution Completed. Summary:');
  console.log('===============================================================');
  console.table(
    results.map((r) => ({
      Step: r.step,
      Name: r.name,
      Status: r.status,
      HTTP: r.httpCode,
    }))
  );

  return results;
}

runE2EFlow().catch((err) => {
  console.error('Fatal execution error:', err);
  process.exit(1);
});

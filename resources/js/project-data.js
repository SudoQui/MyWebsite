window.PORTFOLIO_PROJECTS = [
  {
    id: "mact",
    title: "MACT, Muslims ACT",
    badge: "Flagship product",
    studio: true,
    image: "resources/img/projects/mact.svg",
    filters: ["product", "community", "ai"],
    summary: "A production iOS and Android platform helping Canberra's Muslim community discover halal food, prayer places and community information.",
    tools: ["React Native", "Expo", "TypeScript", "Supabase", "PostgreSQL", "MapLibre", "Ollama", "MCP"],
    problem: "Community information was spread across social channels, outdated pages and word of mouth. People needed a trusted mobile experience that could bring local food, prayer and community information together.",
    built: [
      "Cross platform iOS and Android application with map and list experiences.",
      "Supabase and PostgreSQL data architecture with controlled public access and administration workflows.",
      "Search, filtering, bookmarks, caching, location aware discovery and release environments.",
      "Local AI operations sandbox for auditing, maintenance and future administration automation."
    ],
    role: [
      "Owned product strategy, architecture, development, testing and store release.",
      "Led a four person data and operations team.",
      "Ran stakeholder meetings with community organisations and businesses.",
      "Grew the platform to more than 500 community users."
    ],
    lessons: [
      "Reliable community products require data operations, not only application code.",
      "Release engineering, privacy and administration need to be designed early.",
      "Human review remains important when AI assists with public information."
    ],
    links: [
      { label: "Visit SudoLabs", url: "https://www.sudolabs.app/mact/" },
      { label: "SudoLabs home", url: "https://www.sudolabs.app/" }
    ]
  },
  {
    id: "motorhud",
    title: "MotorHUD Navigation Display",
    badge: "Built through SudoLabs",
    studio: true,
    image: "resources/img/projects/motorhud.svg",
    filters: ["product", "robotics", "ai"],
    summary: "A helmet mounted heads up display that presents navigation and speed information while reducing the need to look at a phone.",
    tools: ["ESP32", "Android", "Bluetooth", "Raspberry Pi", "Computer Vision", "OLED"],
    problem: "Motorcycle navigation often requires riders to look away from the road or depend on audio prompts that can be missed.",
    built: [
      "Android companion application for navigation and speed data.",
      "ESP32 communication hub using Bluetooth.",
      "Transparent OLED display concept for rider visible alerts.",
      "Raspberry Pi vision pipeline for Australian speed sign recognition."
    ],
    role: ["Led end to end system design across mobile software, embedded electronics, computer vision and physical integration."],
    lessons: ["Safety focused interfaces need minimal information, predictable behaviour and careful human factors design."],
    links: [{ label: "GitHub profile", url: "https://github.com/SudoQui" }]
  },
  {
    id: "sawaali",
    title: "Sawaali",
    badge: "Built through SudoLabs",
    studio: true,
    image: "resources/img/projects/sawaali.svg",
    filters: ["product", "community"],
    summary: "A real time Q and A platform for university events with student email access, live voting and moderator controls.",
    tools: ["Next.js", "React", "TypeScript", "Tailwind CSS", "Supabase", "Vercel"],
    problem: "Students needed a simple way to submit questions anonymously while organisers needed safe moderation and live prioritisation.",
    built: [
      "University email access controls.",
      "Anonymous question submission with live ranking and upvotes.",
      "Moderator tools for review and removal.",
      "Realtime database and serverless deployment."
    ],
    role: ["Designed and built the full web application for use at university events."],
    lessons: ["Realtime event tools need clear moderation states and a very low friction user experience."],
    links: [{ label: "GitHub profile", url: "https://github.com/SudoQui" }]
  },
  {
    id: "prayer-wallboard",
    title: "Prayer Time Wallboard",
    badge: "Built through SudoLabs",
    studio: true,
    image: "resources/img/projects/prayer-wallboard.svg",
    filters: ["product", "community", "automation"],
    summary: "A lightweight prayer time display designed for permanent portrait screens in mosques and university spaces.",
    tools: ["HTML", "CSS", "JavaScript", "Raspberry Pi", "GitHub Pages", "Automation"],
    problem: "Community spaces needed an affordable display that could boot directly into a clear, remotely maintainable prayer board.",
    built: [
      "Portrait first responsive wallboard interface.",
      "Prayer time display and next prayer emphasis.",
      "Kiosk deployment approach for Raspberry Pi hardware.",
      "Remote update workflow using a hosted static site."
    ],
    role: ["Designed the interface, deployment approach and maintainable wallboard workflow."],
    lessons: ["Public displays need kiosk resilience, safe recovery and very simple remote operations."],
    links: [{ label: "Prayer Wallboard repository", url: "https://github.com/SudoQui/MSA_PrayerBoard" }]
  },
  {
    id: "sudospeed",
    title: "SudoSpeed",
    badge: "Built through SudoLabs",
    studio: true,
    image: "resources/img/projects/sudospeed.svg",
    filters: ["ai", "robotics", "product"],
    summary: "A computer vision library for recognising Australian speed signs as part of the MotorHUD safety system.",
    tools: ["Python", "OpenCV", "Computer Vision", "Raspberry Pi", "Edge AI"],
    problem: "The rider display needed local speed limit awareness without depending entirely on remote map data.",
    built: [
      "Image processing and sign recognition workflow for Australian road signs.",
      "Edge deployment on Raspberry Pi hardware.",
      "Integration path for real time rider alerts through MotorHUD."
    ],
    role: ["Developed the vision component and integrated it into a broader embedded product architecture."],
    lessons: ["Edge vision must balance accuracy, latency, lighting variation and limited compute."],
    links: [{ label: "GitHub profile", url: "https://github.com/SudoQui" }]
  },
  {
    id: "uni-pen-pals",
    title: "Uni Pen Pals",
    badge: "Student platform",
    studio: false,
    image: "resources/img/projects/uni-pen-pals.svg",
    filters: ["product", "community"],
    summary: "A student matching platform for study support, accountability and community based on interests and enrolled units.",
    tools: ["Prisma ORM", "Tailwind CSS", "Upstash Redis", "Pusher", "Resend API"],
    problem: "Students often want study partners but lack a safe and structured way to find people with compatible subjects and goals.",
    built: [
      "Matching flows based on interests and enrolled units.",
      "Realtime messaging, notifications and email workflows.",
      "Mobile friendly interface with limited profile sharing and reporting tools."
    ],
    role: ["Built the product architecture and primary user experience."],
    lessons: ["Community platforms need safety and privacy controls to be part of the core design."],
    links: [{ label: "GitHub profile", url: "https://github.com/SudoQui" }]
  },
  {
    id: "invoice-ocr",
    title: "Intelligent Invoice OCR Platform",
    badge: "Applied AI",
    studio: false,
    image: "resources/img/projects/invoice-ocr.svg",
    filters: ["ai", "automation"],
    summary: "Production document processing pipelines that reduced invoice handling time by approximately 40 percent.",
    tools: ["Python", "PaddleOCR", "OpenCV", "PyTorch", "Docker", "Jenkins"],
    problem: "Manual invoice extraction was slow and difficult to scale across varied document layouts and scan quality.",
    built: [
      "OCR and image preprocessing pipelines for invoice extraction.",
      "Repeatable testing and deployment workflows using Jenkins and Docker.",
      "Structured outputs for downstream review and processing."
    ],
    role: ["Built and deployed the machine learning pipeline and supported its operational integration."],
    lessons: ["Document AI needs strong validation, observability and fallback handling, not only model accuracy."],
    links: [{ label: "Xaana.AI", url: "https://www.xaana.ai/einvoice" }]
  },
  {
    id: "pmo-automation",
    title: "PMO Approval Automation",
    badge: "Process automation",
    studio: false,
    image: "resources/img/projects/pmo-automation.svg",
    filters: ["automation", "product"],
    summary: "A SharePoint and Power Automate solution that reduced a four hour document approval process to around eleven minutes of monitoring.",
    tools: ["SharePoint", "Power Automate", "Dashboard Design", "Documentation"],
    problem: "A four person PMO team relied on a time intensive manual approval workflow with limited visibility of document status.",
    built: [
      "Automated document approval and routing workflow.",
      "Dashboard showing progress and approval status.",
      "User documentation for adoption and future maintenance."
    ],
    role: ["Independently designed, built and handed over the solution."],
    lessons: ["Simple automation can create major value when it removes repeated coordination and makes work visible."],
    links: []
  },
  {
    id: "rehabilitation-robotics",
    title: "Rehabilitation Robotics",
    badge: "Research and engineering",
    studio: false,
    image: "resources/img/projects/rehabilitation-robotics.svg",
    filters: ["robotics", "ai"],
    summary: "Mechanical design, simulation and early intelligent control work for robotic rehabilitation devices.",
    tools: ["SolidWorks", "MATLAB", "Kinematics", "DSP", "Simulation"],
    problem: "Rehabilitation mechanisms need repeatable motion, suitable geometry and careful integration between mechanical and control systems.",
    built: [
      "3D mechanical components for rehabilitation devices.",
      "Motion system support with PhD researchers.",
      "Simulation and validation work for early machine learning based control prototypes."
    ],
    role: ["Supported research through design, prototyping, simulation, validation and teaching."],
    lessons: ["Robotic systems improve when mechanical, control and user requirements are considered together."],
    links: [{ label: "UC Collaborative Robotics Lab", url: "https://collaborativeroboticslab.github.io/" }]
  },
  {
    id: "nova-rover",
    title: "Nova Rover Prototype",
    badge: "Systems engineering",
    studio: false,
    image: "resources/img/projects/nova-rover.svg",
    filters: ["robotics", "product"],
    summary: "A multidisciplinary rover prototype involving telemetry, sensing, mechanical design and systems engineering practices.",
    tools: ["Raspberry Pi", "Pixhawk", "Python", "Fusion 360", "Sensors", "Telemetry"],
    problem: "The rover concept required reliable integration across mechanical, electrical and software subsystems for remote operation.",
    built: [
      "Realtime telemetry and remote operation capabilities.",
      "Sensor and controller integration.",
      "Modular mechanical components and verification focused documentation."
    ],
    role: ["Contributed to system design, prototyping, testing and engineering documentation."],
    lessons: ["Interfaces between subsystems are often where the most important systems engineering work happens."],
    links: [{ label: "Nova Systems rover case study", url: "https://www.novasystems.com/au/case-study/lunar-services-rover" }]
  }
];

export default async function handler(req, res) {
    // 1. 환경 변수에서 노션 API 키와 데이터베이스 ID를 불러옵니다.
    const NOTION_API_KEY = process.env.NOTION_API_KEY;
    const DATABASE_ID = process.env.NOTION_DATABASE_ID;

    // 한국 시간(KST) 기준으로 오늘 날짜(YYYY-MM-DD) 구하기
    const today = new Date(new Date().getTime() + 9 * 60 * 60 * 1000).toISOString().split('T')[0];

    try {
        const response = await fetch(`https://api.notion.com/v1/databases/${DATABASE_ID}/query`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${NOTION_API_KEY}`,
                'Notion-Version': '2022-06-28',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                // 조건 필터링
                filter: {
                    and: [
                        {
                            property: "완료", // 체크박스 속성 이름
                            checkbox: {
                                equals: false // 체크되지 않은 항목만
                            }
                        },
                        {
                            property: "날짜", // 날짜 속성 이름
                            date: {
                                on_or_after: today // 오늘 날짜 이후의 일정만
                            }
                        }
                    ]
                },
                // 날짜 오름차순 정렬 (가장 가까운 일정이 첫 번째로 오도록)
                sorts: [
                    {
                        property: "날짜",
                        direction: "ascending"
                    }
                ],
                page_size: 1 // 가장 가까운 1개만 가져옴
            })
        });

        if (!response.ok) {
            throw new Error(`Notion API error: ${response.status}`);
        }

        const data = await response.json();

        // 다가오는 일정이 없는 경우 예외 처리
        if (data.results.length === 0) {
            return res.status(200).json({ name: "일정 없음", date: null });
        }

        // 결과에서 이름과 날짜 데이터 추출
        const eventPage = data.results[0];
        const eventName = eventPage.properties["이름"].title[0]?.plain_text || "이름 없는 일정";
        const eventDate = eventPage.properties["날짜"].date.start;

        // 프론트엔드(위젯)로 데이터 반환
        return res.status(200).json({ name: eventName, date: eventDate });

    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: "일정을 불러오는 데 실패했습니다." });
    }
}
package services.coach.utils

private[coach] object CoachPrompts:
  val plan =
    """根据已确认歌曲版本、原唱的基础声学概览、可选的真实检索摘要，提出可验证的演唱难点假设。选 1–4 个最相关的注册工具，不要机械选全。
      |sourceIds 只能引用给定的结果；比较资料矛盾，指出属于其他版本或泛用知识的内容。没来源时标明只是声学或风格假设。
      |位置提示用自然语言。JSON: {"summary":"", "hypotheses":[{"description":"","locationHint":"","sourceIds":[]}],
      |"tools":[{"tool":"注册ID","reason":""}],"limitations":[]}。""".stripMargin

  val map =
    """从 DSP 实测候选中筛出最多 6 个有代表性的难点，要根据证据修订初始假设；无法定位的假设放入 limitations。允许 choices 为空。
      |JSON: {"choices":[{"segmentId":"已有候选ID","title":"","explanation":"","sourceIds":[],"analysisTools":["注册ID"]}],"limitations":[]}。
      |每个难点可选择最多两个补充工具。时间不由你填写。""".stripMargin

  val report =
    """生成有针对性的声乐指导。每项只能引用与该难点相关的实际证据 ID。
      |只有翻唱数据可靠时才做双轨比较，说明录音与采样限制。保留装饰音和风格差异的可能。练习要有目标、步骤、难度、复录验证。
      |必须返回如下字段、层级与类型的 JSON。strengths 与 priorities 使用相同对象格式，各最多三项，缺证据时返回 []。所有文本字段用字符串。
      |{"summary":"总体总结","strengths":[],"priorities":[{"segmentId":"已有难点 ID","evidenceIds":["已有证据 ID"],
      |"observation":"定性观察","interpretation":"可能的原因","practice":{"goal":"目标","steps":["步骤"],"difficulty":"难度说明",
      |"verification":"如何复录验证"}}],"limitations":["局限说明"]}。""".stripMargin

  val followup =
    """判断已有证据是否足够回答问题。只有需要补充时选择最多两个已注册工具；有明确选区时沿用该选区，未指定时可选已有难点 ID。
      |JSON: {"tools":[],"reason":"","segmentId":null}。""".stripMargin

  val answer =
    """使用当前选区、报告和补充实测回答问题。引用本次输入中真实存在的 evidenceId。无法确认的地方如实说明。
      |JSON: {"answer":"","evidenceIds":[]}。""".stripMargin
